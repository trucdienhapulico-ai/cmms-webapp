const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();
const password = '{9oF`xW~';
const remoteDir = '/volume1/docker/cmms-webapp';

async function uploadFile(localPath, remotePath) {
  const b64 = fs.readFileSync(localPath).toString('base64');
  await ssh.execCommand(`rm -f ${remotePath}.b64`);
  const chunkSize = 20000;
  for (let i = 0; i < b64.length; i += chunkSize) {
    const chunk = b64.slice(i, i + chunkSize);
    await ssh.execCommand(`echo "${chunk}" >> ${remotePath}.b64`);
  }
  await ssh.execCommand(`base64 -d ${remotePath}.b64 > ${remotePath} && rm ${remotePath}.b64`);
}

async function run() {
  try {
    const target = process.argv.includes('--stable') ? 'stable' : 'test';
    const containerName = `cmms-${target}`;
    
    console.log(`Connecting to Synology (Target: ${target.toUpperCase()})...`);
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password });
    
    console.log('Uploading server.js, index.html, roadmap.md...');
    await uploadFile('server.js', `${remoteDir}/server.js`);
    await uploadFile('public/index.html', `${remoteDir}/public/index.html`);
    await uploadFile('brain/roadmap.md', `${remoteDir}/brain/roadmap.md`);

    console.log('Uploading Nginx and Env config...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/deploy/nginx ${remoteDir}/env`);
    await uploadFile('deploy/nginx/nginx.conf', `${remoteDir}/deploy/nginx/nginx.conf`);
    await uploadFile('deploy/docker-compose.yml', `${remoteDir}/deploy/docker-compose.yml`);
    await uploadFile('env/stable.env', `${remoteDir}/env/stable.env`);
    await uploadFile('env/test.env', `${remoteDir}/env/test.env`);

    console.log('Uploading data/db.json...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/data`);
    await uploadFile('data/db.json', `${remoteDir}/data/db.json`);
    
    console.log(`Cleaning up old image for ${containerName}...`);
    const rmiCmd = `echo '${password}' | sudo -S docker rmi deploy_${containerName}:latest || true`;
    await ssh.execCommand(rmiCmd);

    console.log(`Building container: ${containerName} (CLEAN BUILD)...`);
    const dockerComposePath = '/usr/local/bin/docker-compose';
    const buildCmd = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin ${dockerComposePath} -f ${remoteDir}/deploy/docker-compose.yml build --no-cache ${containerName}`;
    const resBuild = await ssh.execCommand(buildCmd, { cwd: remoteDir });
    console.log(resBuild.stdout);

    console.log(`Starting container: ${containerName}...`);
    const upCmd = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin ${dockerComposePath} -f ${remoteDir}/deploy/docker-compose.yml up -d --force-recreate ${containerName}`;
    const resUp = await ssh.execCommand(upCmd, { cwd: remoteDir });
    console.log(resUp.stdout);
    
    console.log(`Copying files into ${containerName}...`);
    const filesToCopy = [
      { local: 'data/db.json', remote: '/app/data/db.json' },
      { local: 'server.js', remote: '/app/server.js' },
      { local: 'public/index.html', remote: '/app/public/index.html' }
    ];
    
    for (const f of filesToCopy) {
      const dockerCp = `echo '${password}' | sudo -S docker cp ${remoteDir}/${f.local} ${containerName}:${f.remote}`;
      const resCp = await ssh.execCommand(dockerCp, { cwd: remoteDir });
      console.log(`[CP ${f.local}]:`, resCp.stdout || "OK");
      if (resCp.stderr && !resCp.stderr.includes('Password')) console.error(`[CP ERROR]:`, resCp.stderr);
    }
    
    console.log(`Final restart for ${containerName}...`);
    const dockerRestart = `echo '${password}' | sudo -S docker restart ${containerName} cmms-nginx`;
    await ssh.execCommand(dockerRestart);

    console.log(`Verifying ${containerName} content...`);
    const verifyCmd = `echo '${password}' | sudo -S docker exec ${containerName} grep -n "promoteToStable" /app/public/index.html`;
    const resVerify = await ssh.execCommand(verifyCmd);
    if (resVerify.stdout && resVerify.stdout.includes('promoteToStable')) {
       console.log("Verification SUCCESS: New code found in container.");
    } else {
       console.error("Verification FAILED: New code NOT found in container!");
       console.log("Stdout:", resVerify.stdout);
       console.log("Stderr:", resVerify.stderr);
    }

    console.log(`Successfully deployed to ${target.toUpperCase()}!`);
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
run();

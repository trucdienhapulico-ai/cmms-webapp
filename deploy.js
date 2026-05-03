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

    console.log('Uploading Nginx config...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/deploy/nginx`);
    await uploadFile('deploy/nginx/nginx.conf', `${remoteDir}/deploy/nginx/nginx.conf`);
    await uploadFile('deploy/docker-compose.yml', `${remoteDir}/deploy/docker-compose.yml`);

    console.log('Uploading data/db.json...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/data`);
    await uploadFile('data/db.json', `${remoteDir}/data/db.json`);
    
    console.log(`Rebuilding and restarting container: ${containerName}...`);
    const dockerComposePath = '/usr/local/bin/docker-compose';
    // Ensure both the app container AND nginx are up
    const dockerCmd = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "${dockerComposePath} -f ${remoteDir}/deploy/docker-compose.yml up -d --build ${containerName} nginx"`;
    
    let res = await ssh.execCommand(dockerCmd, { cwd: remoteDir });
    console.log(res.stdout);
    
    console.log(`Copying db.json into ${containerName}...`);
    const dockerCp = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "docker cp ${remoteDir}/data/db.json ${containerName}:/app/data/db.json"`;
    res = await ssh.execCommand(dockerCp, { cwd: remoteDir });
    
    console.log(`Restarting ${containerName} and nginx...`);
    const dockerRestart = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "docker restart ${containerName} cmms-nginx"`;
    res = await ssh.execCommand(dockerRestart, { cwd: remoteDir });
    console.log(res.stdout);

    console.log(`Successfully deployed to ${target.toUpperCase()}!`);
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
run();

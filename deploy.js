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
    console.log('Connecting...');
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password });
    
    console.log('Uploading server.js...');
    await uploadFile('server.js', `${remoteDir}/server.js`);
    
    console.log('Uploading public/index.html...');
    await uploadFile('public/index.html', `${remoteDir}/public/index.html`);
    
    console.log('Uploading brain/roadmap.md...');
    await uploadFile('brain/roadmap.md', `${remoteDir}/brain/roadmap.md`);

    console.log('Uploading data/db.json...');
    await ssh.execCommand(`mkdir -p ${remoteDir}/data`);
    await uploadFile('data/db.json', `${remoteDir}/data/db.json`);
    
    console.log('Rebuilding and restarting containers...');
    const dockerComposePath = '/usr/local/bin/docker-compose';
    const dockerCmd = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "${dockerComposePath} -f ${remoteDir}/deploy/docker-compose.yml up -d --build"`;
    
    let res = await ssh.execCommand(dockerCmd, { cwd: remoteDir });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    
    console.log('Copying db.json into containers...');
    const dockerCp1 = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "docker cp ${remoteDir}/data/db.json cmms-stable:/app/data/db.json"`;
    res = await ssh.execCommand(dockerCp1, { cwd: remoteDir });
    
    const dockerCp2 = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "docker cp ${remoteDir}/data/db.json cmms-test:/app/data/db.json"`;
    res = await ssh.execCommand(dockerCp2, { cwd: remoteDir });
    
    console.log('Restarting containers to load new DB...');
    const dockerRestart = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "docker restart cmms-stable cmms-test"`;
    res = await ssh.execCommand(dockerRestart, { cwd: remoteDir });
    console.log(res.stdout);
    
    console.log('Done!');
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
run();

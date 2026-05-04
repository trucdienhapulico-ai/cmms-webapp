const { NodeSSH } = require('node-ssh');
const fs = require('fs');

const ssh = new NodeSSH();
const password = '{9oF`xW~';
const remoteDir = '/volume1/docker/cmms-webapp';

async function run() {
  try {
    await ssh.connect({
      host: 'onecloud', port: 2242, username: 'synologybot', password: password
    });
    
    const b64 = fs.readFileSync('deploy/docker-compose.yml').toString('base64');
    const remoteFile = `${remoteDir}/deploy/docker-compose.yml`;
    await ssh.execCommand(`rm -f ${remoteFile}.b64`);
    const chunkSize = 20000;
    for (let i = 0; i < b64.length; i += chunkSize) {
      const chunk = b64.slice(i, i + chunkSize);
      await ssh.execCommand(`echo "${chunk}" >> ${remoteFile}.b64`);
    }
    await ssh.execCommand(`base64 -d ${remoteFile}.b64 > ${remoteFile} && rm ${remoteFile}.b64`);
    
    console.log('Restarting docker-compose...');
    const dockerComposePath = '/usr/local/bin/docker-compose';
    const dockerCmd = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin bash -c "${dockerComposePath} -f ${remoteDir}/deploy/docker-compose.yml up -d --force-recreate"`;
    
    const res = await ssh.execCommand(dockerCmd, { cwd: remoteDir });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    
    console.log('Done!');
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
run();

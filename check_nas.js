const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const password = process.env.NAS_SSH_PASSWORD;

async function run() {
  await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password });
  const res = await ssh.execCommand('ls -la /volume1/docker/cmms-webapp/data');
  console.log(res.stdout);
  ssh.dispose();
}
run();

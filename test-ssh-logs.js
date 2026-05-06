const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: 'onecloud', port: 2242, username: 'synologybot', password: process.env.NAS_SSH_PASSWORD
    });
    const res = await ssh.execCommand("ls -la /volume1/docker/cmms-webapp");
    console.log("CLOUDFLARED LOGS:");
    console.log(res.stdout);
    if (res.stderr) {
      console.log("STDERR:");
      console.log(res.stderr);
    }
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
run();

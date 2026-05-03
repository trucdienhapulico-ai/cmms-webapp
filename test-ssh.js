const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: 'onecloud', port: 2242, username: 'synologybot', password: '{9oF`xW~'
    });
    const res = await ssh.execCommand("grep -n 'display: flex' public/index.html", { cwd: '/volume1/docker/cmms-webapp' });
    console.log("NAS FILE OUTPUT:");
    console.log(res.stdout);
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
run();

const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const pass = '{9oF`xW~';
(async () => {
  try {
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password: pass });
    
    console.log("--- KIỂM TRA BẢN STABLE ---");
    const resEnv = await ssh.execCommand("docker exec cmms-stable env | grep NODE_ENV");
    console.log("NODE_ENV:", resEnv.stdout.trim());
    
    const resVersion = await ssh.execCommand("docker exec cmms-stable node -e 'console.log(require(\"./server.js\"))' | grep version");
    // Just try to see if server.js is updated
    const resCheck = await ssh.execCommand("docker exec cmms-stable grep -n 'promoteToStable' public/index.html");
    console.log("Tìm thấy 'promoteToStable' trong index.html:", resCheck.stdout ? "CÓ" : "KHÔNG");

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
})();

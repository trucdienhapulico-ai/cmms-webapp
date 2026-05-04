const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const pass = '{9oF`xW~';
(async () => {
  try {
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password: pass });
    
    console.log("--- KIỂM TRA BẢN STABLE LẦN CUỐI ---");
    const cmd = `echo '${pass}' | sudo -S /usr/local/bin/docker exec cmms-stable grep -n "promoteToStable" /app/public/index.html`;
    const res = await ssh.execCommand(cmd);
    console.log("KẾT QUẢ:", res.stdout || "KHÔNG THẤY");

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
})();

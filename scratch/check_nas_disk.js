const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const pass = '{9oF`xW~';
(async () => {
  try {
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password: pass });
    
    console.log("--- KIỂM TRA FILE TRÊN ĐĨA NAS ---");
    const res = await ssh.execCommand('grep -n "promoteToStable" /volume1/docker/cmms-webapp/public/index.html');
    console.log("KẾT QUẢ:", res.stdout || "KHÔNG THẤY");

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
})();

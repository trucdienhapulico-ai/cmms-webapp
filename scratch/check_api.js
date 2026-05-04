const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const pass = '{9oF`xW~';
(async () => {
  try {
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password: pass });
    
    console.log("--- GỌI API HEALTH TỪ NAS (STABLE) ---");
    const res = await ssh.execCommand('curl -s http://localhost:8080/api/health');
    console.log("KẾT QUẢ:", res.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
})();

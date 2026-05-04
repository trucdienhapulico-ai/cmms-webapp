const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const pass = '{9oF`xW~';
(async () => {
  try {
    await ssh.connect({ host: 'onecloud', port: 2242, username: 'synologybot', password: pass });
    
    console.log("--- RECREATING STABLE CONTAINER ---");
    const cmd = `echo '${pass}' | sudo -S /usr/local/bin/docker-compose -f /volume1/docker/cmms-webapp/deploy/docker-compose.yml up -d --force-recreate cmms-stable`;
    const res = await ssh.execCommand(cmd);
    console.log(res.stdout);
    console.log(res.stderr);

    console.log("--- VERIFYING ENV ---");
    const resEnv = await ssh.execCommand(`echo '${pass}' | sudo -S /usr/local/bin/docker exec cmms-stable env | grep NODE_ENV`);
    console.log("NODE_ENV:", resEnv.stdout.trim());

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
})();

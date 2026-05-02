const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ssh = new NodeSSH();
const password = '{9oF`xW~';
const remoteDir = '/volume1/docker/cmms-webapp';
const dockerComposePath = '/usr/local/bin/docker-compose';

async function run() {
  try {
    const rootDir = path.resolve(__dirname, '../..');
    process.chdir(rootDir);

    console.log('📦 1. Creating Zip package...');
    if (fs.existsSync('app.zip')) fs.unlinkSync('app.zip');
    const zipCmd = `powershell -Command "Get-ChildItem -Exclude node_modules,.git,brain,backups,app.zip,app.tar | Compress-Archive -DestinationPath app.zip -Force"`;
    execSync(zipCmd);

    console.log('🚀 2. Connecting to Synology NAS...');
    await ssh.connect({
      host: 'onecloud', port: 2242, username: 'synologybot', password: password
    });

    console.log('📤 3. Uploading app.zip (via Base64 stream)...');
    const b64 = fs.readFileSync('app.zip').toString('base64');
    const chunkSize = 20000;
    const remoteFile = `${remoteDir}/app.zip`;
    await ssh.execCommand(`mkdir -p ${remoteDir}`);
    await ssh.execCommand(`rm -f ${remoteFile}.b64`);
    for (let i = 0; i < b64.length; i += chunkSize) {
      const chunk = b64.slice(i, i + chunkSize);
      await ssh.execCommand(`echo "${chunk}" >> ${remoteFile}.b64`);
    }
    await ssh.execCommand(`base64 -d ${remoteFile}.b64 > ${remoteFile} && rm ${remoteFile}.b64`);

    console.log('🏗️ 4. Extracting and Verifying...');
    await ssh.execCommand(`/usr/bin/7z x app.zip -aoa`, { cwd: remoteDir });
    const verify = await ssh.execCommand(`grep "bottom-nav" public/index.html`, { cwd: remoteDir });
    if (verify.stdout.includes('bottom-nav')) {
      console.log('✅ VERIFIED: index.html on NAS is now UP-TO-DATE.');
    } else {
      throw new Error('Verification FAILED: index.html on NAS is still OLD!');
    }
    await ssh.execCommand(`chmod -R 777 ${remoteDir}`);
    
    console.log('🐳 5. Restarting Docker (No Cache)...');
    const dockerCmd = `echo '${password}' | sudo -S env PATH=$PATH:/usr/local/bin:/var/packages/Docker/target/usr/bin ${dockerComposePath} -f ${remoteDir}/deploy/docker-compose.yml up -d --build --force-recreate --no-cache`;
    await ssh.execCommand(dockerCmd, { cwd: remoteDir });

    console.log('✨ 6. DEPLOYMENT SUCCESSFUL!');
    ssh.dispose();
    if (fs.existsSync('app.zip')) fs.unlinkSync('app.zip');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (ssh) ssh.dispose();
  }
}

run();

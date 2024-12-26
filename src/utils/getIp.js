const os = require('os');

function getServerIP() {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        for (const net of networkInterfaces[interfaceName]) {
            // Check if the address is an IPv4 and not internal (not a loopback address)
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'Unable to determine server IP address';
}

module.exports = {
    getServerIP
};
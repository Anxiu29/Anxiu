const packages = new Array<Uint8Array>();
const lastTime = new Date();
const msgInterval = 180;
let roopInterval = 20;

let isWaitReport = false;
let interval: any = null;

self.addEventListener('message', (event) => {
    if (event.data === 'start') {
        console.log('Communication start loop....')
        startLoop();
    } else if (event.data === 'stop') {
        console.log('Communication stop loop....')
        if (interval != null) {
            clearInterval(interval);
        }
    }  else if (event.data === 'report') {
        isWaitReport = false;
    } else {
        let p = event.data as Uint8Array;
        packages.splice(0, 0, p);
    }
});

function startLoop() {
    interval = setInterval(() => {
        const currentTime = new Date();
        let elapsedTime = currentTime.getTime() - lastTime.getTime();
        if (elapsedTime > msgInterval) isWaitReport = false;
        if (!isWaitReport) {
            if (packages.length > 0) {
                let p = packages.pop();
                if (p != undefined) {
                    self.postMessage(p);
                    lastTime.setTime(currentTime.getTime());
                }
            } else {
                if (elapsedTime > 1000) {
                    self.postMessage('heartbeat');
                    lastTime.setTime(currentTime.getTime());
                }
            }

            isWaitReport = true;
        }
    }, roopInterval);
}
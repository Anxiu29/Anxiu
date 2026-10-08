const donglePkgQueue = new Array<any>();
const dongleLastTime = new Date();
const msgAppedTime = new Date();
const dongleMsgInterval = 3000;

let dongleInterval: any = null;
let dongleIsWaitPkgFinish = false;
let dongleIsWaitMsgFinish = false;
let lastMsg: string = '';
let dongleIntervalId: any = undefined;

self.addEventListener('message', (event) => {
    if (event.data === 'start') {
        console.log('Communication start loop....')
        dongleStartLoop();
    } else if (event.data === 'stop') {
        console.log('Communication stop loop....')
        if (dongleInterval != null) {
            clearInterval(dongleInterval);
        }
    } else if (event.data === 'finish') {
        dongleIsWaitPkgFinish = false;
        dongleIsWaitMsgFinish = false;
        if (donglePkgQueue.length <= 0) self.postMessage('finish');
    } else if (event.data === 'report') {
        const rptTime = new Date();
        dongleLastTime.setTime(rptTime.getTime());
        msgAppedTime.setTime(rptTime.getTime());
        dongleIsWaitMsgFinish = false;
    } else {
        let p = event.data;
        const appedTime = new Date();
        msgAppedTime.setTime(appedTime.getTime());
        donglePkgQueue.splice(0, 0, p);
    }
});

function dongleStartLoop() {
    dongleInterval = setInterval(() => {
        const currentTime = new Date();
        let elapsedTime = currentTime.getTime() - dongleLastTime.getTime();
        let tickTime = currentTime.getTime() - msgAppedTime.getTime();

        if (elapsedTime > dongleMsgInterval && dongleIsWaitPkgFinish)
        {
            dongleLastTime.setTime(currentTime.getTime());
            self.postMessage('timeout');
        }

        if (!dongleIsWaitPkgFinish) {
            if (donglePkgQueue.length > 0 && tickTime > 15) {
                let p = donglePkgQueue.pop();
                if (p != undefined) {
                    lastMsg = p;
                    self.postMessage(p);
                    dongleLastTime.setTime(currentTime.getTime());
                    dongleIsWaitPkgFinish = true;
                    dongleIsWaitMsgFinish = true;
                }
            }
        } else if (!dongleIsWaitMsgFinish) {
            if (tickTime > 15) {
                self.postMessage(lastMsg);
                dongleLastTime.setTime(currentTime.getTime());
                dongleIsWaitMsgFinish = true;
            }
        }
    }, 10);
}
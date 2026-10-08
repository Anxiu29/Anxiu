import type { KeyboardState } from '../interface'
import { REPORT_ID_USB, MACRO_PER_BLOCK_LENGTH, MACRO_MAX_LENGTH } from './packets/packet';
import { ConnectionStatusEnum, ConnectionType } from '@/device/enum';
import { KeyMatrixLayer, MatrixTable } from '../enum';
import { RK_CB75, RK_CB75_EVENT_DEFINE } from './rk_cb75';

import { GetProfilePacket } from './packets/usb/getProfilePacket';
import { SetProfilePacket } from './packets/usb/setProfilePacket';

import { GetLedEffectPacket } from './packets/usb/getLedEffectPacket';
import { SetLedEffectPacket } from './packets/usb/setLedEffectPacket';

import { GetKeyMatrixPacket } from './packets/usb/getKeyMatrixPacket';
import { SetKeyMatrixPacket } from './packets/usb/setKeyMatrixPacket';

import { GetMacrosPacket } from './packets/usb/getMacrosPacket';
import { SetMacrosPacket } from './packets/usb/setMacrosPacket';

import { GetLedColorsPacket } from './packets/usb/getLedColorsPacket';
import { SetLedColorsPacket } from './packets/usb/setLedColorsPacket';

import { GetPasswordPacket } from './packets/usb/getPasswordPacket';
import { SetFactoryPacket } from './packets/usb/setFactoryPacket';

import { SetWebKeyTabPacket } from './packets/usb/setWebKeyTabPacket';

import { Macros } from './macros';

const worker = new Worker(new URL('@/common/communication.ts', import.meta.url));

export class RK_CB75_Usb extends RK_CB75 {

    constructor(state: KeyboardState, device: HIDDevice) {
        super(state, device);
        state.connectType = ConnectionType.USB;
    }

    static async create(state: KeyboardState, device: HIDDevice) {
        return new RK_CB75_Usb(state, device);
    }

    async init(): Promise<void> {
        super.init();
        this.state.ConnectionStatus = ConnectionStatusEnum.Connected;

        worker.onmessage = async (event) => {
            if (event.data == 'heartbeat') {
            } else {
                try {
                    await this.setFeature(REPORT_ID_USB, event.data as Uint8Array);
                } catch (e) {
                    this.device.close();
                }
            }
        };
        
        worker.postMessage('start');
        await this.getPassword();
    }

    async onGetReport(reportId: number, data: DataView): Promise<void> {

    }

    async getProfile(board: number): Promise<void> {
        let packet = new GetProfilePacket(board);

        await this.setFeature(REPORT_ID_USB, packet.setReport);
        packet.fromReportData(await this.getFeature(REPORT_ID_USB));

        this.data.boardProfile = packet.boardProfile;
        this.dispatchEvent(new CustomEvent(RK_CB75_EVENT_DEFINE.OnProfileGotten, { detail: this.data.boardProfile }));
    }

    async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getPassword(): Promise<void> {
        let packet = new GetPasswordPacket();

        await this.setFeature(REPORT_ID_USB, packet.setReport);
        await this.sleep(500);
        packet.fromReportData(await this.getFeature(REPORT_ID_USB));

        this.state.fwVersion = packet.fwVersion;
        //this.dispatchEvent(new CustomEvent(RK_CB75_EVENT_DEFINE.OnProfileGotten, { detail: this.data.profile }));
    }

    async setProfile(board: number): Promise<void> {
        if (this.data.boardProfile != undefined) {
            let packet = new SetProfilePacket(board);
            packet.setPayload(this.data.boardProfile.buffer);
            //await this.setFeature(REPORT_ID_USB, packet.setReport);
            worker.postMessage(packet.setReport);
            console.log(`Push profile data to queue.`);
        }
    }

    async getLedEffect(board: number): Promise<void> {
        let packet = new GetLedEffectPacket(board);

        await this.setFeature(REPORT_ID_USB, packet.setReport);
        packet.fromReportData(await this.getFeature(REPORT_ID_USB));

        this.data.ledEffect = packet.ledEffect;
        this.dispatchEvent(new CustomEvent(RK_CB75_EVENT_DEFINE.OnLedEffectGotten, { detail: this.data.ledEffect }));
    }

    async setLedEffect(board: number): Promise<void> {
        if (this.data.ledEffect != undefined) {
            let packet = new SetLedEffectPacket(board);
            packet.setPayload(this.data.ledEffect.buffer);
            //await this.setFeature(REPORT_ID_USB, packet.setReport);
            worker.postMessage(packet.setReport);
            console.log(`Push led effect data to queue.`);
        }
    }

    async getKeyMatrix(layer: KeyMatrixLayer, table: MatrixTable, board: number): Promise<void> {
        let packet = new GetKeyMatrixPacket(layer, table, board);

        await this.setFeature(REPORT_ID_USB, packet.setReport);
        packet.fromReportData(await this.getFeature(REPORT_ID_USB));

        if (this.data.keyMatrixs != undefined && packet.keyMatrix != undefined) {
            this.data.keyMatrixs[table][layer] = packet.keyMatrix;
        }
        this.dispatchEvent(new CustomEvent(RK_CB75_EVENT_DEFINE.OnKeyMatrixGotten, { detail: this.data.keyMatrixs }));
    }

    async setKeyMatrix(layer: KeyMatrixLayer, table: MatrixTable, board: number): Promise<void> {
        if (this.data.keyMatrixs != undefined) {
            let packet = new SetKeyMatrixPacket(layer, table, board);
            packet.setPayload(this.data.keyMatrixs[table][layer].buffer);
            //await this.setFeature(REPORT_ID_USB, packet.setReport);
            worker.postMessage(packet.setReport);
            console.log(`Push layer [${layer}] key matrix data to queue.`);
        }
    }

    async getMacros(): Promise<void> {
        let block = 0;
        let blockCount = MACRO_MAX_LENGTH / MACRO_PER_BLOCK_LENGTH;
        let u8 = new Uint8Array(MACRO_MAX_LENGTH);

        for (block = 0; block < blockCount; block++) {
            let packet = new GetMacrosPacket(block, blockCount);
            await this.setFeature(REPORT_ID_USB, packet.setReport);
            packet.fromReportData(await this.getFeature(REPORT_ID_USB));
            if (packet.buffer != undefined) {
                u8.set(packet.buffer, block * MACRO_PER_BLOCK_LENGTH);
            }
        }

        this.data.macros = Macros.deserialize(new DataView(u8.buffer));
        this.dispatchEvent(new CustomEvent(RK_CB75_EVENT_DEFINE.OnMacrosGotten, { detail: this.data.macros }));
    }

    async setMacros(): Promise<void> {
        if (this.data.macros != undefined) {
            let packet = new SetMacrosPacket();
            let u8 = this.data.macros?.serialize();
            let block = 0;
            packet.packageNum = Math.ceil(u8.length / MACRO_PER_BLOCK_LENGTH);

            for (block = 0; block < packet.packageNum; block++) {
                packet.packageIndex = block;
                let begin = block * MACRO_PER_BLOCK_LENGTH;
                let end = begin + ((block + 1) * MACRO_PER_BLOCK_LENGTH > u8.length ? u8.length - (block * MACRO_PER_BLOCK_LENGTH) : MACRO_PER_BLOCK_LENGTH);
                let tmp = u8.slice(begin, end);
                packet.setPayload(new DataView(tmp.buffer));
                await this.setFeature(REPORT_ID_USB, packet.setReport);
            }

            // let pkgs = new Array<DataView>();
            // let index = 0;
            // do {
            //     let end = index + MACRO_PER_BLOCK_LENGTH > u8.length ? u8.length : index + MACRO_PER_BLOCK_LENGTH;
            //     pkgs.push(new DataView(u8.subarray(index, end).buffer));
            //     index = end + 1;
            // } while (index < u8.length)

            // packet.packageNum = pkgs.length;
            // index = 0;
            // for (let pkg of pkgs) {
            //     packet.packageIndex = index;
            //     packet.setPayload(pkg);
            //     await this.setFeature(REPORT_ID_USB, packet.setReport);
            // }
        }
    }

    async getLedColors(board: number): Promise<void> {
        let packet = new GetLedColorsPacket(board);

        await this.setFeature(REPORT_ID_USB, packet.setReport);
        packet.fromReportData(await this.getFeature(REPORT_ID_USB));

        this.data.ledColors = packet.ledColors;
        this.dispatchEvent(new CustomEvent(RK_CB75_EVENT_DEFINE.OnLedColorsGotten, { detail: this.data.ledColors }));
    }


    async setLedColors(board: number): Promise<void> {
        if (this.data.ledColors != undefined) {
            let packet = new SetLedColorsPacket(board);
            packet.setPayload(this.data.ledColors.buffer);
            //await this.setFeature(REPORT_ID_USB, packet.setReport);
            worker.postMessage(packet.setReport);
            console.log(`Push led colors data to queue.`);
        }
    }

    async setFactory(): Promise<void> {
        let packet = new SetFactoryPacket();
        //await this.setFeature(REPORT_ID_USB, packet.setReport);
        worker.postMessage(packet.setReport);
    }

    async setWebKeyTab(web: 'https://drive.rkgaming.com/'): Promise<void> {
        let packet = new SetWebKeyTabPacket();
        const buff: number[] = [];
        
        for (const char of web) {
            const asciiCode = char.charCodeAt(0);
            buff.push(asciiCode);
        }

        packet.setPayload(new DataView(new Uint8Array(buff).buffer));

        worker.postMessage(packet.setReport);
    }
}
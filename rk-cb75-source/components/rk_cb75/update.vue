<template>
    <div class="fw-update-page d-flex jc-center ai-center w-100 h-100">
        <div class="fw-update-content d-flex flex-column">
            <template v-if="isUsbConnected">
                <div class="fw-card status-card">
                    <div class="fw-device-name">{{ deviceName }}</div>
                    <div class="fw-current-version">{{ $t('set.fw_current') }}: {{ currentVersion }}</div>
                    <div v-if="isLatest" class="fw-status fw-status--latest d-flex ai-center">
                        <span class="fw-status-icon">✓</span>
                        <span>{{ $t('set.fw_latest_ok') }}</span>
                    </div>
                    <div v-else class="fw-status fw-status--update d-flex ai-center">
                        <span>{{ $t('set.fw_has_update') }}: {{ latestVersion }}</span>
                    </div>
                </div>

                <div class="fw-card update-card">
                    <div class="fw-card-header">
                        <div class="fw-latest-version">{{ $t('set.latest') }} {{ latestVersion }}</div>
                        <div v-if="updateDate" class="fw-update-date">{{ $t('set.fw_update_time') }}: {{ updateDate }}</div>
                    </div>
                    <div class="fw-divider"></div>
                    <div class="fw-step-desc">{{ $t('set.title_20') }}</div>
                    <div class="fw-warning">{{ $t('set.fw_warning') }}</div>
                    <div class="fw-action">
                        <button
                            class="fw-next-btn"
                            :class="{ 'fw-next-btn--idle': isLatest }"
                            :disabled="loading"
                            @click="checkVer(true)"
                        >
                            {{ $t('set.but_4') }}(<span>{{ verTips }}</span>)
                        </button>
                    </div>
                    <el-progress
                        v-if="fwDownloading"
                        class="fw-progress"
                        :percentage="100"
                        :indeterminate="true"
                        :duration="2"
                    />
                </div>
            </template>
            <div v-else class="fw-card wire-tip-card">
                <div class="fw-device-name">{{ deviceName }}</div>
                <div class="fw-wire-tip">{{ $t('set.fw_wire_tip') }}</div>
            </div>

            <div v-if="hasDriverAvailable" class="fw-card driver-card">
                <div class="fw-card-header">
                    <div class="fw-latest-version">{{ $t('set.driver_1') }}</div>
                    <div class="fw-update-date">{{ $t('set.driver_2') }}</div>
                </div>
                <div class="fw-divider"></div>
                <div v-if="currentDriver" class="driver-info">
                    <div class="driver-info-row">
                        <span class="driver-info-label">{{ $t('set.driver_8') }}:</span>
                        <span>{{ currentDriver.model }}</span>
                    </div>
                    <div class="driver-info-row">
                        <span class="driver-info-label">{{ $t('set.driver_9') }}:</span>
                        <span>{{ $t(currentDriver.connectionMode) }}</span>
                    </div>
                </div>
                <div v-else class="fw-step-desc">{{ $t('set.driver_3') }}</div>
                <div class="fw-action">
                    <button
                        class="fw-next-btn"
                        :disabled="driverDownloading || !currentDriver"
                        @click="downloadCurrentDriver"
                    >
                        {{ driverDownloading ? $t('set.driver_4') : $t('set.driver_11') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Action } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { keyboard } from '@/keyboard/beiying/keyboard';
import { uselightStore } from '@/stores/rk_cb75/lightStore';
import { ConnectionType } from '@/device/enum';
import { getDriverInfo, downloadDriver, type DriverInfo } from '@/common/driverData';
import { getFirmwareJsonUrl } from '@/keyboard/beiying/rk_cb75/firmwareConfig';

const { t } = useI18n();
const useLight = uselightStore();

const currentVersion = ref(keyboard.state.fwVersion);
const latestVersion = ref(keyboard.state.fwVersion);
const updateDate = ref('');
const url = ref('');
const loading = ref(true);
const fwDownloading = ref(false);
const driverDownloading = ref(false);
const currentDriver = ref<DriverInfo | null>(null);

const deviceName = computed(() => keyboard.keyboardDefine?.name ?? 'CB75-keyboard');
const currentModel = computed(() =>
    typeof keyboard.keyboardDefine?.name === 'string' ? keyboard.keyboardDefine.name : ''
);
const hasDriverAvailable = computed(() => {
    if (!currentModel.value) return false;
    return getDriverInfo(currentModel.value).length > 0;
});
const isUsbConnected = computed(() => useLight.connectType === ConnectionType.USB);
const isLatest = computed(() => currentVersion.value === latestVersion.value);
const verTips = computed(() =>
    currentVersion.value !== latestVersion.value
        ? `${t('set.title_3')}:${latestVersion.value}`
        : t('set.title_2')
);

const getVer = () => {
    const jsonUrl = getFirmwareJsonUrl(keyboard.keyboardDefine?.productId);
    if (!jsonUrl) {
        loading.value = false;
        return;
    }
    loading.value = true;
    axios.get(jsonUrl)
        .then((response) => {
            latestVersion.value = response.data.version;
            url.value = response.data.url;
            updateDate.value = response.data.date ?? response.data.updateTime ?? '';
            checkVer();
        })
        .catch((error) => {
            console.error(error);
        })
        .finally(() => {
            loading.value = false;
        });
};

const startUpdate = () => {
    fwDownloading.value = true;
    ElMessage({
        type: 'info',
        message: t('set.title_4'),
    });
    window.open(url.value, '_blank');
    fwDownloading.value = false;
};

const initDriverInfo = () => {
    const modelName = currentModel.value;
    if (!modelName) {
        currentDriver.value = null;
        return;
    }
    const drivers = getDriverInfo(modelName);
    currentDriver.value = drivers.length > 0 ? drivers[0] : null;
};

const downloadCurrentDriver = async () => {
    if (!currentDriver.value) return;
    try {
        driverDownloading.value = true;
        downloadDriver(currentDriver.value);
        ElMessage.success(t('set.driver_5'));
    } catch (error) {
        console.error('Download failed:', error);
        ElMessage.error(t('set.driver_6'));
    } finally {
        driverDownloading.value = false;
    }
};

const checkVer = (flag: boolean = false) => {
    if (!isUsbConnected.value && flag) {
        ElMessage({
            type: 'info',
            message: t('set.title_5'),
        });
        return;
    }
    if (currentVersion.value !== latestVersion.value && isUsbConnected.value) {
        ElMessageBox.alert(`${t('set.title_3')}:${latestVersion.value}`, t('set.but_4'), {
            confirmButtonText: 'OK',
            callback: (action: Action) => {
                if (action === 'confirm') {
                    startUpdate();
                }
            },
        });
    } else if (flag) {
        ElMessage({
            type: 'info',
            message: t('set.title_2'),
        });
    }
};

onMounted(async () => {
    await useLight.init();
    currentVersion.value = keyboard.state.fwVersion;
    initDriverInfo();
    getVer();
});
</script>

<style lang="scss" scoped>
.fw-update-page {
    background: var(--cb75-bg, #0b0f14);
    padding: 32px;
    box-sizing: border-box;
    min-width: 0;
    min-height: 0;
    overflow: auto;
}

.fw-update-content {
    width: 100%;
    max-width: 720px;
    gap: 20px;
    min-width: 0;
}

.fw-card {
    background: var(--cb75-surface, #11151d);
    border-radius: 14px;
    padding: 28px 32px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    min-width: 0;

    .fw-action {
        display: flex;
        justify-content: center;
    }

    .fw-next-btn {
        width: 100%;
        max-width: 360px;
        padding: 14px 24px;
        border: none;
        border-radius: 10px;
        background: var(--cb75-accent, #45e6d0);
        color: var(--cb75-on-accent, #061619);
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;

        &:hover:not(:disabled) {
            background: var(--cb75-accent-hover, #63f3e0);
        }

        &:disabled {
            background: var(--anxiu-control, #1b222c);
            color: var(--cb75-muted, #93a5af);
            cursor: not-allowed;
        }

        &--idle:not(:disabled) {
            border: 1px solid var(--cb75-border, #29333d);
            background: var(--anxiu-control, #1b222c);
            color: var(--cb75-text, #e8f4f5);
        }

        &--idle:hover:not(:disabled) {
            background: var(--cb75-accent-soft, #173a39);
        }
    }
}
@media (max-width: 700px) {
    .fw-update-page { padding: 14px; align-items: flex-start; }
    .fw-card { padding: 20px 16px; }
    .fw-device-name { overflow-wrap: anywhere; }
}

.status-card {
    .fw-device-name {
        font-size: 22px;
        font-weight: 700;
        color: var(--cb75-text, #e8f4f5);
        margin-bottom: 12px;
    }

    .fw-current-version {
        font-size: 14px;
        color: var(--cb75-muted, #93a5af);
        margin-bottom: 16px;
    }
}

.wire-tip-card {
    .fw-device-name {
        font-size: 22px;
        font-weight: 700;
        color: var(--cb75-text, #e8f4f5);
        margin-bottom: 16px;
    }

    .fw-wire-tip {
        font-size: 16px;
        font-weight: 500;
        color: #fa8c16;
        line-height: 1.6;
    }
}

.fw-status {
    font-size: 14px;
    font-weight: 500;

    &--latest {
        color: #52c41a;

        .fw-status-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #52c41a;
            color: #fff;
            font-size: 11px;
            margin-right: 8px;
        }
    }

    &--update {
        color: #fa8c16;
    }
}

.update-card {
    .fw-card-header {
        margin-bottom: 16px;
    }

    .fw-latest-version {
        font-size: 16px;
        font-weight: 700;
        color: var(--cb75-text, #e8f4f5);
        margin-bottom: 6px;
    }

    .fw-update-date {
        font-size: 13px;
        color: var(--cb75-muted, #93a5af);
    }

    .fw-divider {
        height: 1px;
        background: var(--cb75-border, #29333d);
        margin-bottom: 20px;
    }

    .fw-step-desc {
        font-size: 14px;
        color: var(--cb75-muted, #93a5af);
        line-height: 1.6;
        margin-bottom: 12px;
    }

    .fw-warning {
        font-size: 13px;
        color: #ff4d4f;
        margin-bottom: 28px;
    }

    .fw-progress {
        margin-top: 16px;
    }
}

.driver-card {
    .fw-card-header {
        margin-bottom: 16px;
    }

    .fw-latest-version {
        font-size: 16px;
        font-weight: 700;
        color: var(--cb75-text, #e8f4f5);
        margin-bottom: 6px;
    }

    .fw-update-date {
        font-size: 13px;
        color: var(--cb75-muted, #93a5af);
    }

    .fw-divider {
        height: 1px;
        background: var(--cb75-border, #29333d);
        margin-bottom: 20px;
    }

    .driver-info {
        margin-bottom: 24px;
    }

    .driver-info-row {
        font-size: 14px;
        color: var(--cb75-muted, #93a5af);
        line-height: 1.8;

        .driver-info-label {
            font-weight: 600;
            color: var(--cb75-text, #e8f4f5);
            margin-right: 8px;
        }
    }
}
</style>

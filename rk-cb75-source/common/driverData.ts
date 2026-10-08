export interface DriverInfo {
  model: string
  id: string
  connectionMode: string
  protocolType: string
  downloadUrl: string
  remarks?: string
}

// CB75 entry retained from RK's driver catalog.
export const driverData: DriverInfo[] = [{
  model: 'CB75-keyboard',
  id: '863',
  connectionMode: 'set.driver_14',
  protocolType: 'BeiYing',
  downloadUrl: 'https://www.rkgaming.com/work/Update-RGB/RK_Keyboard_Software_BY_Setup.exe',
}]

export function getDriverInfo(model: string): DriverInfo[] {
  return driverData.filter(driver => driver.model === model)
}

export function downloadDriver(driver: DriverInfo) {
  const link = document.createElement('a')
  link.href = driver.downloadUrl
  link.download = `RK_${driver.model}_Driver.exe`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** 用户点击后下载本地文本；不上传内容，也不保留对象 URL。 */
export function downloadText(text: string, fileName: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = fileName
  document.body.append(link)
  try { link.click() }
  finally {
    link.remove()
    // 让浏览器先处理下载，再释放 Blob URL。
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

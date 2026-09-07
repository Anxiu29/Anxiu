/** 每次读取捕获版本；上下文改变或新读取开始后，旧结果、错误和 finally 都失效。 */
export function createRequestScope() {
  let revision = 0
  return {
    invalidate() { revision++ },
    begin() {
      const observed = ++revision
      return () => observed === revision
    },
  }
}

/**
 * 二次认证（X 决策：本轮直接透传执行，不拦截）。
 * auth 落地后，withReAuth 内部走 @SaCheckSafe 的二次校验流程。
 */
export function useReAuth() {
  return {
    /**
     * 包装危险操作（卸载/删除等）。本轮直接执行 fn，无拦截。
     * @param fn 危险操作
     */
    async withReAuth<T>(fn: () => Promise<T>): Promise<T> {
      // TODO(auth 落地后): 调二次认证接口，校验通过后才执行 fn
      return fn();
    },
  };
}

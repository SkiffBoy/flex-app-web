import { defineStore } from 'pinia';

// 必须加 plugin-demo/ 前缀，避免与其他插件 store 冲突（spec §样式隔离）
export const useDemoStore = defineStore('plugin-demo/demo', {
  state: () => ({
    msg: '',
    loading: false,
  }),
  actions: {
    setMsg(msg: string) {
      this.msg = msg;
    },
    setLoading(loading: boolean) {
      this.loading = loading;
    },
  },
});

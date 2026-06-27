import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('#/views/workflow/definition/index.vue'),
        meta: { icon: 'lucide:list', title: '定义管理' },
        name: 'WorkflowDefinition',
        path: '/workflow/definition',
      },
      {
        component: () => import('#/views/workflow/designer/index.vue'),
        meta: { hideInMenu: true, icon: 'lucide:git-branch', title: '流程设计器' },
        name: 'WorkflowDesigner',
        path: '/workflow/designer/:id?',
      },
      {
        component: () => import('#/views/workflow/monitor/index.vue'),
        meta: { icon: 'lucide:activity', title: '运行监控' },
        name: 'WorkflowMonitor',
        path: '/workflow/monitor',
      },
      {
        component: () => import('#/views/workflow/monitor/detail.vue'),
        meta: { hideInMenu: true, title: '实例详情' },
        name: 'WorkflowMonitorDetail',
        path: '/workflow/monitor/:instanceId',
      },
    ],
    meta: { icon: 'lucide:workflow', order: 100, title: '工作流' },
    name: 'Workflow',
    path: '/workflow',
    redirect: '/workflow/definition',
  },
];

export default routes;

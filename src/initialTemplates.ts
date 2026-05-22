import type { ProjectConfig } from './types';

export const inventoryDashboardTemplate: ProjectConfig = {
  appName: "My Mobile App",
  homePageId: "page-1",
  globalStates: [],
  collections: [],
  pages: [
    {
      id: "page-1",
      name: "Home",
      elements: [
        {
          id: "el-header",
          type: "container",
          label: "Header",
          styles: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e2e8f0"
          },
          properties: {},
          actions: {},
          children: [
            {
              id: "el-title",
              type: "heading",
              label: "Title",
              styles: { fontSize: "20px", fontWeight: "700", color: "#0f172a" },
              properties: { value: "My App" },
              actions: {}
            },
            {
              id: "el-icon-btn",
              type: "icon",
              label: "Menu Icon",
              styles: { color: "#6366f1" },
              properties: { iconName: "Menu", iconSize: 24 },
              actions: {}
            }
          ]
        },
        {
          id: "el-content",
          type: "container",
          label: "Content",
          styles: {
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "16px"
          },
          properties: {},
          actions: {},
          children: [
            {
              id: "el-welcome",
              type: "text",
              label: "Welcome Text",
              styles: { fontSize: "14px", color: "#64748b" },
              properties: { value: "Welcome to your mobile app. Start adding components below." },
              actions: {}
            }
          ]
        },
        {
          id: "el-grid",
          type: "grid",
          label: "Grid",
          styles: { padding: "0 16px 16px", display: "grid", gap: "12px" },
          properties: { gridCols: 2 },
          actions: {},
          children: [
            {
              id: "el-card-1",
              type: "card",
              label: "Card 1",
              styles: {
                padding: "20px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "center",
                textAlign: "center" as any
              },
              properties: {},
              actions: {},
              children: [
                {
                  id: "el-icon-1",
                  type: "icon",
                  label: "Feature Icon",
                  styles: { color: "#6366f1" },
                  properties: { iconName: "Smartphone", iconSize: 32 },
                  actions: {}
                },
                {
                  id: "el-text-1",
                  type: "text",
                  label: "Feature Label",
                  styles: { fontSize: "12px", fontWeight: "600", color: "#0f172a" },
                  properties: { value: "Feature" },
                  actions: {}
                }
              ]
            },
            {
              id: "el-card-2",
              type: "card",
              label: "Card 2",
              styles: {
                padding: "20px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "center",
                textAlign: "center" as any
              },
              properties: {},
              actions: {},
              children: [
                {
                  id: "el-icon-2",
                  type: "icon",
                  label: "Feature Icon",
                  styles: { color: "#6366f1" },
                  properties: { iconName: "Bell", iconSize: 32 },
                  actions: {}
                },
                {
                  id: "el-text-2",
                  type: "text",
                  label: "Feature Label",
                  styles: { fontSize: "12px", fontWeight: "600", color: "#0f172a" },
                  properties: { value: "Alerts" },
                  actions: {}
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export const taskTrackerTemplate: ProjectConfig = {
  appName: "FlowTask Visual Board",
  homePageId: "tasks-home",
  globalStates: [
    { name: "taskTitle", type: "string", defaultValue: "" },
    { name: "taskPriority", type: "string", defaultValue: "Medium" }
  ],
  collections: [
    {
      name: "Tasks",
      fields: [
        { name: "Title", type: "text" },
        { name: "Priority", type: "text" },
        { name: "Status", type: "text" }
      ],
      records: [
        { _id: "task-1", Title: "Compile presentation deck", Priority: "High", Status: "Pending" },
        { _id: "task-2", Title: "Perform full audit of database schema", Priority: "High", Status: "Completed" },
        { _id: "task-3", Title: "Design new landing page layouts", Priority: "Medium", Status: "Pending" },
        { _id: "task-4", Title: "Write visual styling guidelines", Priority: "Low", Status: "Completed" }
      ]
    }
  ],
  pages: [
    {
      id: "tasks-home",
      name: "Workspace Board",
      elements: [
        {
          id: "t-header",
          type: "container",
          label: "Header Box",
          styles: {
            padding: "24px",
            backgroundColor: "#1e1b4b",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          },
          properties: {},
          actions: {},
          children: [
            {
              id: "t-main-heading",
              type: "heading",
              label: "Heading",
              styles: { fontSize: "22px", fontWeight: "800", color: "#ffffff" },
              properties: { value: "FlowTask Board" },
              actions: {}
            },
            {
              id: "t-sub-heading",
              type: "text",
              label: "Subtext",
              styles: { fontSize: "13px", color: "#c7d2fe" },
              properties: { value: "Organize, prioritize, and manage internal development backlogs" },
              actions: {}
            }
          ]
        },
        {
          id: "t-grid",
          type: "grid",
          label: "Board Body Grid",
          styles: { padding: "20px", display: "grid", gap: "20px" },
          properties: { gridCols: 2 },
          actions: {},
          children: [
            {
              id: "t-card-creator",
              type: "card",
              label: "Creator Form Card",
              styles: {
                padding: "24px",
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                height: "fit-content"
              },
              properties: {},
              actions: {},
              children: [
                {
                  id: "t-form-title",
                  type: "heading",
                  label: "Form Header",
                  styles: { fontSize: "15px", fontWeight: "700", color: "#1e293b" },
                  properties: { value: "Create Backlog Task" },
                  actions: {}
                },
                {
                  id: "t-input-group-1",
                  type: "container",
                  label: "Title field container",
                  styles: { display: "flex", flexDirection: "column", gap: "6px" },
                  properties: {},
                  actions: {},
                  children: [
                    {
                      id: "t-lbl-title",
                      type: "text",
                      label: "Label",
                      styles: { fontSize: "11px", fontWeight: "600", color: "#64748b" },
                      properties: { value: "Task Description" },
                      actions: {}
                    },
                    {
                      id: "t-inp-title",
                      type: "input",
                      label: "Title Input Field",
                      styles: {
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "8px",
                        fontSize: "13px"
                      },
                      properties: { placeholder: "e.g. Implement Oauth2 Flow" },
                      actions: {
                        onChange: { type: "state", stateKey: "taskTitle" }
                      }
                    }
                  ]
                },
                {
                  id: "t-input-group-2",
                  type: "container",
                  label: "Priority field container",
                  styles: { display: "flex", flexDirection: "column", gap: "6px" },
                  properties: {},
                  actions: {},
                  children: [
                    {
                      id: "t-lbl-pri",
                      type: "text",
                      label: "Label",
                      styles: { fontSize: "11px", fontWeight: "600", color: "#64748b" },
                      properties: { value: "Priority" },
                      actions: {}
                    },
                    {
                      id: "t-inp-pri",
                      type: "select",
                      label: "Priority Select",
                      styles: {
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "8px",
                        fontSize: "13px",
                        backgroundColor: "#fff"
                      },
                      properties: { options: ["High", "Medium", "Low"] },
                      actions: {
                        onChange: { type: "state", stateKey: "taskPriority" }
                      }
                    }
                  ]
                },
                {
                  id: "t-btn-add",
                  type: "button",
                  label: "Save Task Button",
                  styles: {
                    backgroundColor: "#1e1b4b",
                    color: "#ffffff",
                    padding: "10px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    border: "none",
                    textAlign: "center"
                  },
                  properties: { value: "+ Append Task" },
                  actions: {
                    onClick: {
                      type: "script",
                      code: `if (!state.taskTitle) {\n  toast("Please enter a task title");\n  return;\n}\n\ncollections.Tasks.add({\n  Title: state.taskTitle,\n  Priority: state.taskPriority || "Medium",\n  Status: "Pending"\n});\n\ntoast("Task added directly to Board collection!");\nstate.taskTitle = "";`
                    }
                  }
                }
              ]
            },
            {
              id: "t-card-list",
              type: "card",
              label: "Board Task List Card",
              styles: {
                padding: "24px",
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              },
              properties: {},
              actions: {},
              children: [
                {
                  id: "t-list-title",
                  type: "heading",
                  label: "List Header",
                  styles: { fontSize: "15px", fontWeight: "700", color: "#1e293b" },
                  properties: { value: "Task List (Dynamic Collection)" },
                  actions: {}
                },
                {
                  id: "t-list-table",
                  type: "table",
                  label: "Task Board Table",
                  styles: {},
                  properties: {
                    dataSource: "Tasks",
                    columns: ["Title", "Priority", "Status"]
                  },
                  actions: {}
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

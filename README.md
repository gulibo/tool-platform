# 内部工具平台 - 模块化版

这是一个基于模块化架构的工具平台，支持通过GitHub仓库动态加载功能模块，同时保留原有的管理员上传JS文件功能。

## 文件结构

```
05GitHub框架/
├── index.html              # 主页面（一次性编写，永不修改）
├── core/                   # 核心模块（永不修改）
│   ├── core-engine.js     # 核心引擎（Excel处理等）
│   ├── state-manager.js   # 状态管理器
│   ├── auth.js            # 认证模块
│   ├── ui.js              # UI管理模块
│   ├── tool-loader.js     # 工具加载器
│   ├── gist-sync.js       # Gist同步模块
│   ├── admin.js           # 管理员功能
│   ├── user.js            # 用户功能
│   └── app.js             # 应用入口
├── modules/               # GitHub仓库模块（后续新增）
│   ├── expense/           # 差旅费报销模块示例
│   │   └── module.js
│   └── ...                # 其他模块
├── config/
│   └── modules.json       # 模块配置
└── README.md              # 使用说明
```

## 部署到GitHub Pages

### 步骤1：创建GitHub仓库
1. 登录GitHub，点击右上角 `+` → `New repository`
2. 仓库名：`tool-platform`（或其他名称）
3. 选择 `Public`（或Private，但需要GitHub Pro才能使用Pages）
4. 点击 `Create repository`

### 步骤2：上传代码
```bash
# 在05GitHub框架文件夹内执行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/tool-platform.git
git push -u origin main
```

### 步骤3：启用GitHub Pages
1. 进入仓库页面，点击 `Settings`
2. 左侧菜单选择 `Pages`
3. Source 选择 `Deploy from a branch`
4. Branch 选择 `main`，文件夹选择 `/(root)`
5. 点击 `Save`
6. 等待几分钟，访问显示的URL（如 `https://你的用户名.github.io/tool-platform/`）

## 使用方式

### 方式1：管理员上传JS文件（原有功能）
适合快速添加简单工具，操作步骤：
1. 登录管理员账号
2. 进入"工具管理"
3. 点击"新建工具"
4. 选择分类、上传JS文件、填写说明
5. 保存

### 方式2：通过GitHub仓库添加模块（新增功能）
适合添加复杂功能，操作步骤：

1. **创建模块文件夹**
   ```bash
   mkdir modules/新模块名称
   ```

2. **编写模块代码**
   创建 `modules/新模块名称/module.js`：
   ```javascript
   const 新模块名称 = {
       name: '模块显示名称',
       description: '模块说明',
       icon: '📦',
       
       init: function() {
           // 模块初始化逻辑
           console.log('模块已加载');
       },
       
       // 其他功能函数...
   };
   
   window.新模块名称 = 新模块名称;
   ```

3. **注册模块**
   修改 `config/modules.json`：
   ```json
   {
       "modules": ["expense", "新模块名称"],
       "version": "1.0.0"
   }
   ```

4. **提交到GitHub**
   ```bash
   git add .
   git commit -m "Add new module: 新模块名称"
   git push
   ```

5. **刷新网页**
   访问GitHub Pages链接，新模块自动加载

## 数据迁移

### 原有数据是否需要重新上传？
**不需要！** 新框架完全兼容原有数据：
- 用户上传的JS工具会自动从localStorage加载
- Gist配置会自动同步
- 所有工具配置保持不变

### 迁移步骤
1. 部署新框架到GitHub Pages
2. 访问新网址
3. 使用原有密码登录
4. 所有原有工具自动可用

## 功能对比

| 功能 | 原系统 | 新框架 |
|-----|-------|-------|
| 密码登录 | ✓ | ✓ |
| 新增工具（上传JS） | ✓ | ✓ |
| 编辑工具 | ✓ | ✓ |
| 分类管理 | ✓ | ✓ |
| Gist同步 | ✓ | ✓ |
| 日志管理 | ✓ | ✓ |
| GitHub模块加载 | ✗ | ✓ |
| 动态功能扩展 | ✗ | ✓ |

## 注意事项

1. **主HTML永不修改**：所有功能通过core模块和modules实现
2. **模块独立**：每个模块独立成一个文件夹，互不影响
3. **版本控制**：模块可以独立版本管理
4. **按需加载**：只加载config/modules.json中配置的模块

## 常见问题

**Q: 如何添加差旅费报销功能？**
A: 将expense模块添加到config/modules.json中即可。

**Q: 原有上传的JS文件还能用吗？**
A: 完全可用，所有原有功能保留。

**Q: 如何备份配置？**
A: 在管理员设置页面点击"导出配置"，或配置Gist自动同步。

**Q: 模块加载失败怎么办？**
A: 检查浏览器控制台错误信息，确保模块代码格式正确。

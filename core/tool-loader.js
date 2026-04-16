// 工具加载器 - 管理所有工具（包括GitHub模块和用户上传的JS）
// ToolPlatform - 新格式模块注册平台
const ToolPlatform = {
    toolConfigs: {},
    
    registerTool: function(id, config) {
        this.toolConfigs[id] = config;
        console.log(`Registered tool: ${id}`);
    },
    
    getToolConfig: function(id) {
        return this.toolConfigs[id];
    },
    
    renderTool: function(id, container) {
        const config = this.toolConfigs[id];
        if (config && config.render) {
            config.render(container);
        } else {
            container.innerHTML = '<p>工具加载失败</p>';
        }
    }
};

const ToolLoader = {
    // 已注册的工具逻辑
    toolLogics: {},

    // 已加载的模块
    loadedModules: {},

    // 初始化 - 加载所有工具
    init: async function() {
        console.log('[ToolLoader] Starting initialization...');
        
        // 1. 加载用户上传的JS工具（从localStorage）
        console.log('[ToolLoader] Loading user tools...');
        await this.loadUserTools();
        
        // 2. 加载GitHub仓库模块
        console.log('[ToolLoader] Loading GitHub modules...');
        await this.loadGitHubModules();
        
        // 3. 保存状态到本地存储（确保GitHub模块被持久化）
        console.log('[ToolLoader] Saving state to localStorage...');
        StateManager.saveToLocal();
        console.log('[ToolLoader] Initialization complete');
        
        // 4. 打印当前分类和工具列表（用于调试）
        const categories = StateManager.get('categories');
        console.log('[ToolLoader] Current categories:', categories.map(c => ({
            name: c.name,
            toolCount: c.tools.length,
            tools: c.tools.map(t => ({ id: t.id, name: t.name }))
        })));
    },

    // 加载用户上传的JS工具（原有功能保留）
    loadUserTools: async function() {
        const customTools = StateManager.get('customTools') || [];
        
        for (const tool of customTools) {
            try {
                this.registerToolLogic(tool.logicType, {
                    process: this.createProcessFunction(tool.code),
                    sheetName: tool.sheetName,
                    description: tool.desc
                });
                console.log(`Loaded custom tool: ${tool.name}`);
            } catch (err) {
                console.error(`Failed to load custom tool ${tool.name}:`, err);
            }
        }
    },

    // 加载GitHub仓库模块
    loadGitHubModules: async function() {
        console.log('[ToolLoader] Starting loadGitHubModules...');
        try {
            console.log('[ToolLoader] Fetching config/modules.json...');
            const response = await fetch('config/modules.json');
            console.log('[ToolLoader] modules.json response status:', response.status);
            
            if (!response.ok) {
                console.log('[ToolLoader] No modules.json found, skipping GitHub modules');
                return;
            }
            
            const config = await response.json();
            console.log('[ToolLoader] modules.json loaded, modules count:', (config.modules || []).length);
            
            // 支持新的模块配置格式（对象数组）
            for (const moduleConfig of config.modules || []) {
                try {
                    // 判断是字符串（旧格式）还是对象（新格式）
                    if (typeof moduleConfig === 'string') {
                        // 旧格式：模块名称字符串
                        await this.loadModule(moduleConfig);
                        console.log(`[ToolLoader] Loaded module: ${moduleConfig}`);
                    } else if (typeof moduleConfig === 'object' && moduleConfig.id) {
                        // 新格式：模块配置对象
                        console.log(`[ToolLoader] Loading module from config: ${moduleConfig.id}`);
                        await this.loadModuleFromConfig(moduleConfig);
                        console.log(`[ToolLoader] Loaded module: ${moduleConfig.id}`);
                    }
                } catch (err) {
                    console.error(`Failed to load module ${moduleConfig.id || moduleConfig}:`, err);
                }
            }
        } catch (err) {
            console.error('Failed to load modules config:', err);
        }
    },

    // 从配置加载模块（新格式）
    loadModuleFromConfig: function(moduleConfig) {
        return new Promise((resolve, reject) => {
            const { id, name, entry, category, icon, description, enabled } = moduleConfig;
            
            // 检查是否已加载
            if (this.loadedModules[id]) {
                resolve();
                return;
            }

            // 如果模块被禁用，跳过
            if (enabled === false) {
                console.log(`Module ${id} is disabled, skipping`);
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = entry;
            script.onload = () => {
                // 模块自注册
                if (typeof ToolPlatform !== 'undefined' && ToolPlatform.getToolConfig(id)) {
                    // 新格式：使用ToolPlatform注册
                    const toolConfig = ToolPlatform.getToolConfig(id);
                    this.loadedModules[id] = toolConfig;
                    
                    // 将工具添加到分类
                    this.addToolToCategory({
                        id: id,
                        name: name || toolConfig.name,
                        icon: icon || toolConfig.icon,
                        desc: description || toolConfig.description,
                        category: category || '其他工具',
                        entry: entry
                    });
                } else if (window[id] && window[id].init) {
                    // 旧格式：全局对象
                    window[id].init();
                    this.loadedModules[id] = window[id];
                }
                resolve();
            };
            script.onerror = (e) => {
                console.error(`Failed to load script for module ${id}:`, e);
                reject(e);
            };
            document.head.appendChild(script);
        });
    },

    // 加载单个模块（旧格式，保持兼容）
    loadModule: function(moduleName) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (this.loadedModules[moduleName]) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `modules/${moduleName}/module.js`;
            script.onload = () => {
                // 模块自注册
                if (window[moduleName] && window[moduleName].init) {
                    window[moduleName].init();
                    this.loadedModules[moduleName] = window[moduleName];
                }
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // 添加工具到分类
    addToolToCategory: function(toolInfo) {
        const { id, name, icon, desc, category } = toolInfo;
        
        console.log(`[addToolToCategory] Starting for tool: ${id}, category: ${category}`);
        
        // 获取当前所有分类
        const categories = StateManager.get('categories');
        console.log(`[addToolToCategory] Current categories count: ${categories ? categories.length : 'undefined'}`);
        
        if (!categories) {
            console.error(`[addToolToCategory] categories is undefined!`);
            return;
        }
        
        // 查找或创建分类
        let categoryObj = categories.find(c => c.name === category);
        console.log(`[addToolToCategory] Found existing category: ${categoryObj ? 'yes' : 'no'}`);
        
        if (!categoryObj) {
            // 创建新分类 - 注意：addCategory 只接受 name 参数
            console.log(`[addToolToCategory] Creating new category: ${category}`);
            categoryObj = StateManager.addCategory(category);
            console.log(`[addToolToCategory] Created category result:`, categoryObj);
        }
        
        // 再次确认分类对象存在
        if (!categoryObj) {
            console.error(`[addToolToCategory] Failed to find or create category: ${category}`);
            return;
        }
        
        console.log(`[addToolToCategory] Using category: ${categoryObj.name}, id: ${categoryObj.id}`);
        
        // 检查工具是否已存在（在所有分类中检查）
        const allTools = categories.flatMap(c => c.tools);
        const existingTool = allTools.find(t => t.id === id);
        if (existingTool) {
            console.log(`Tool ${id} already exists, skipping`);
            return;
        }
        
        // 添加工具到分类
        const tool = {
            id: id,
            name: name,
            icon: icon || '🛠️',
            desc: desc || '',
            enabled: true,
            isGitHubModule: true  // 标记为GitHub模块
        };
        
        StateManager.addToolToCategory(categoryObj.id, tool);
        console.log(`Added tool ${name} to category ${category}`);
        
        // 立即保存到 localStorage
        StateManager.saveToLocal();
        console.log(`State saved after adding tool ${id}`);
    },

    // 注册工具逻辑
    registerToolLogic: function(logicType, config) {
        this.toolLogics[logicType] = {
            process: config.process,
            sheetName: config.sheetName || logicType,
            description: config.description || ''
        };
    },

    // 从代码创建处理函数
    createProcessFunction: function(code) {
        return function(rawData) {
            const context = {
                console: console,
                CoreEngine: CoreEngine,
                toolConfig: null
            };
            
            // 安全执行代码
            new Function('context', code)(context);
            
            if (context.toolConfig && context.toolConfig.process) {
                return context.toolConfig.process(rawData);
            }
            
            throw new Error('Tool code does not contain valid process function');
        };
    },

    // 获取工具逻辑
    getToolLogic: function(logicType) {
        return this.toolLogics[logicType];
    },

    // 检查工具逻辑是否存在
    hasToolLogic: function(logicType) {
        return !!this.toolLogics[logicType];
    },

    // 上传新工具（管理员功能）
    uploadTool: function(file, config) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const code = e.target.result;
                    
                    // 验证代码格式
                    if (!this.validateToolCode(code)) {
                        reject(new Error('代码文件格式错误：缺少 toolConfig 或 process 函数'));
                        return;
                    }
                    
                    // 提取工具信息
                    const toolInfo = this.extractToolInfo(code);
                    const logicType = 'custom_' + Date.now();
                    
                    // 注册工具逻辑
                    this.registerToolLogic(logicType, {
                        process: this.createProcessFunction(code),
                        sheetName: toolInfo.sheetName || toolInfo.name,
                        description: toolInfo.description || ''
                    });
                    
                    // 保存到状态
                    const toolData = {
                        id: Date.now(),
                        name: toolInfo.name,
                        logicType: logicType,
                        code: code,
                        sheetName: toolInfo.sheetName || toolInfo.name,
                        desc: config.desc || '',
                        createdAt: new Date().toISOString()
                    };
                    
                    StateManager.addCustomTool(toolData);
                    
                    // 添加到分类
                    const tool = {
                        id: Date.now(),
                        name: toolInfo.name,
                        logic: logicType,
                        enabled: true,
                        desc: config.desc || ''
                    };
                    
                    StateManager.addToolToCategory(config.categoryId, tool);
                    
                    resolve(tool);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // 验证工具代码
    validateToolCode: function(code) {
        return code.includes('toolConfig') && code.includes('process');
    },

    // 提取工具信息
    extractToolInfo: function(code) {
        const context = {
            console: console,
            CoreEngine: CoreEngine,
            toolConfig: null
        };
        
        new Function('context', code)(context);
        
        if (context.toolConfig) {
            return {
                name: context.toolConfig.name || '未命名工具',
                sheetName: context.toolConfig.sheetName,
                description: context.toolConfig.description
            };
        }
        
        return { name: '未命名工具' };
    }
};


// 状态管理器 - 管理应用状态和持久化
const StateManager = {
    // 默认状态
    defaultState: {
        userPass: 'user666',
        adminPass: 'admin888',
        logs: [],
        categories: [
            { 
                id: 1, 
                name: '稽查核心工具', 
                tools: [] 
            }
        ],
        customTools: [], // 用户上传的JS工具
        gistConfig: {
            gistId: "4763dbe1e92bea54c0571f9aec90e0cb",
            fileName: "tool_config.json",
            enabled: true
        },
        ocrConfig: {
            provider: 'tesseract', // 'tesseract' | 'huawei'
            huawei: {
                accountType: 'main', // 'main' | 'iam'
                endpoint: 'ocr.cn-north-4.myhuaweicloud.com',
                ak: '',
                sk: '',
                projectId: '',
                domain: '' // IAM用户需要填写主账号名
            }
        }
    },

    // 当前状态
    state: null,

    // 初始化状态
    init: async function() {
        console.log('[StateManager] Starting initialization...');
        
        // 先尝试从localStorage加载（优先使用本地状态，包含GitHub模块）
        const saved = localStorage.getItem('tool_platform_v7');
        console.log('[StateManager] localStorage data exists:', !!saved);
        
        if (saved) {
            try {
                console.log('[StateManager] Parsing localStorage data...');
                const loadedState = JSON.parse(saved);
                console.log('[StateManager] localStorage data parsed successfully');
                this.state = this.mergeState(loadedState);
                console.log('[StateManager] Config loaded from localStorage, categories:', this.state.categories.length);
                // 仍然尝试从Gist加载以获取最新配置，但会合并而不是覆盖
                await this.syncFromGist();
                return;
            } catch (err) {
                console.error('[StateManager] Failed to load from localStorage:', err);
                // 如果解析失败，清除localStorage并使用默认状态
                localStorage.removeItem('tool_platform_v7');
                console.log('[StateManager] Cleared corrupted localStorage');
            }
        }

        // 尝试从Gist加载
        if (this.defaultState.gistConfig.enabled) {
            try {
                const response = await fetch(`https://api.github.com/gists/${this.defaultState.gistConfig.gistId}`);
                if (response.ok) {
                    const gist = await response.json();
                    const file = gist.files[this.defaultState.gistConfig.fileName];
                    if (file && file.content) {
                        const loadedState = JSON.parse(file.content);
                        this.state = this.mergeState(loadedState);
                        this.saveToLocal();
                        console.log('Config loaded from Gist');
                        return;
                    }
                }
            } catch (err) {
                console.error('Failed to load from Gist:', err);
            }
        }

        // 使用默认状态
        this.state = CoreEngine.deepClone(this.defaultState);
        this.saveToLocal();
        console.log('Using default config');
    },
    
    // 从Gist同步配置（合并模式，不覆盖本地GitHub模块）
    syncFromGist: async function() {
        if (!this.defaultState.gistConfig.enabled) return;
        
        try {
            const response = await fetch(`https://api.github.com/gists/${this.defaultState.gistConfig.gistId}`);
            if (!response.ok) return;
            
            const gist = await response.json();
            const file = gist.files[this.defaultState.gistConfig.fileName];
            if (!file || !file.content) return;
            
            const gistState = JSON.parse(file.content);
            
            // 合并密码、日志和OCR配置（但不覆盖分类，以保留GitHub模块）
            if (gistState.userPass) this.state.userPass = gistState.userPass;
            if (gistState.adminPass) this.state.adminPass = gistState.adminPass;
            if (gistState.logs) this.state.logs = gistState.logs;
            if (gistState.ocrConfig) this.state.ocrConfig = { ...this.state.ocrConfig, ...gistState.ocrConfig };
            
            // 对于分类，只合并用户上传的工具，保留GitHub模块
            if (gistState.categories) {
                gistState.categories.forEach(gistCat => {
                    const localCat = this.state.categories.find(c => c.id === gistCat.id);
                    if (localCat) {
                        // 合并非GitHub模块的工具
                        gistCat.tools.forEach(gistTool => {
                            if (!gistTool.isGitHubModule) {
                                const exists = localCat.tools.find(t => t.id === gistTool.id);
                                if (!exists) {
                                    localCat.tools.push(gistTool);
                                }
                            }
                        });
                    } else {
                        // 添加Gist中的新分类（但只包含非GitHub模块工具）
                        const newCat = {
                            ...gistCat,
                            tools: gistCat.tools.filter(t => !t.isGitHubModule)
                        };
                        if (newCat.tools.length > 0) {
                            this.state.categories.push(newCat);
                        }
                    }
                });
            }
            
            this.saveToLocal();
            console.log('Config synced from Gist (GitHub modules preserved)');
        } catch (err) {
            console.error('Failed to sync from Gist:', err);
        }
    },

    // 合并状态（确保结构完整）
    mergeState: function(loadedState) {
        const merged = CoreEngine.deepClone(this.defaultState);
        
        if (loadedState.userPass) merged.userPass = loadedState.userPass;
        if (loadedState.adminPass) merged.adminPass = loadedState.adminPass;
        if (loadedState.logs) merged.logs = loadedState.logs;
        if (loadedState.categories) merged.categories = loadedState.categories;
        if (loadedState.customTools) merged.customTools = loadedState.customTools;
        if (loadedState.gistConfig) merged.gistConfig = { ...merged.gistConfig, ...loadedState.gistConfig };
        if (loadedState.ocrConfig) merged.ocrConfig = { ...merged.ocrConfig, ...loadedState.ocrConfig };
        
        // 如果本地已有 GitHub 模块工具（通过 addCategory/addToolToCategory 添加的），保留它们
        // 注意：这个方法在 init() 时调用，此时 ToolLoader 尚未加载模块
        // 所以改为在 ToolLoader 加载后再次同步状态
        
        return merged;
    },

    // 保存到localStorage
    saveToLocal: function() {
        try {
            localStorage.setItem('tool_platform_v7', JSON.stringify(this.state));
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
        }
    },

    // 获取状态
    get: function(key) {
        if (key) {
            return this.state[key];
        }
        return this.state;
    },

    // 设置状态
    set: function(key, value) {
        this.state[key] = value;
        this.saveToLocal();
    },

    // 更新状态（批量）
    update: function(updates) {
        Object.assign(this.state, updates);
        this.saveToLocal();
    },

    // 添加日志
    addLog: function(action, user) {
        this.state.logs.push({
            time: new Date().toLocaleString('zh-CN'),
            user: user || '系统',
            action: action
        });
        if (this.state.logs.length > 1000) {
            this.state.logs = this.state.logs.slice(-1000);
        }
        this.saveToLocal();
    },

    // 添加分类
    addCategory: function(name) {
        console.log(`[StateManager.addCategory] Called with name: ${name}`);
        console.log(`[StateManager.addCategory] this.state exists: ${!!this.state}`);
        console.log(`[StateManager.addCategory] this.state.categories exists: ${!!(this.state && this.state.categories)}`);
        
        if (!this.state || !this.state.categories) {
            console.error(`[StateManager.addCategory] Error: state or categories is undefined!`);
            return null;
        }
        
        const newCat = {
            id: Date.now(),
            name: name,
            tools: []
        };
        this.state.categories.push(newCat);
        this.saveToLocal();
        console.log(`[StateManager.addCategory] Created category: ${name}, id: ${newCat.id}`);
        return newCat;
    },

    // 更新分类
    updateCategory: function(id, updates) {
        const cat = this.state.categories.find(c => c.id === id);
        if (cat) {
            Object.assign(cat, updates);
            this.saveToLocal();
        }
        return cat;
    },

    // 删除分类
    deleteCategory: function(id) {
        this.state.categories = this.state.categories.filter(c => c.id !== id);
        this.saveToLocal();
    },

    // 添加工具到分类
    addToolToCategory: function(catId, tool) {
        const cat = this.state.categories.find(c => c.id === catId);
        if (cat) {
            cat.tools.push(tool);
            this.saveToLocal();
        }
    },

    // 从分类中删除工具
    removeToolFromCategory: function(catId, toolId) {
        const cat = this.state.categories.find(c => c.id === catId);
        if (cat) {
            cat.tools = cat.tools.filter(t => t.id !== toolId);
            this.saveToLocal();
        }
    },

    // 添加自定义工具（用户上传的JS）
    addCustomTool: function(toolData) {
        this.state.customTools.push(toolData);
        this.saveToLocal();
    },

    // 删除自定义工具
    removeCustomTool: function(toolId) {
        this.state.customTools = this.state.customTools.filter(t => t.id !== toolId);
        this.saveToLocal();
    },

    // 导出配置
    exportConfig: function() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tool_config_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // 导入配置
    importConfig: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedState = JSON.parse(e.target.result);
                    this.state = this.mergeState(importedState);
                    this.saveToLocal();
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};

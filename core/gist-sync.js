// Gist同步模块
const GistSync = {
    // 同步到Gist
    sync: async function(token) {
        const config = StateManager.get('gistConfig');
        if (!config.enabled) {
            throw new Error('Gist同步已禁用');
        }
        
        if (!token) {
            throw new Error('请提供GitHub个人访问令牌');
        }
        
        const state = StateManager.get();
        
        const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${token}`
            },
            body: JSON.stringify({
                files: {
                    [config.fileName]: {
                        content: JSON.stringify(state, null, 2)
                    }
                }
            })
        });
        
        if (!response.ok) {
            throw new Error('同步失败：' + response.statusText);
        }
        
        StateManager.addLog('手动同步配置到 Gist', '管理员');
        return true;
    },

    // 更新Gist配置
    updateConfig: function(newConfig) {
        StateManager.set('gistConfig', {
            ...StateManager.get('gistConfig'),
            ...newConfig
        });
    }
};

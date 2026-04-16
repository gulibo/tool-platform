// 用户模块
const User = {
    // 渲染用户界面
    render: function() {
        const container = document.getElementById('dynamicContent');
        const categories = StateManager.get('categories') || [];
        
        // 检查是否有分类
        if (categories.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📂</div>
                    <h3 style="margin-bottom: 10px;">暂无可用工具</h3>
                    <p>管理员尚未添加任何工具分类</p>
                </div>
            `;
            return;
        }
        
        // 显示分类网格
        container.innerHTML = `
            <div class="tool-grid" id="catGrid"></div>
        `;
        
        const grid = document.getElementById('catGrid');
        
        categories.forEach(cat => {
            const enabledTools = cat.tools.filter(t => t.enabled);
            if (enabledTools.length === 0) return;
            
            const card = UI.renderCategoryCard(cat, () => {
                this.showCategoryTools(cat);
            });
            grid.appendChild(card);
        });
        
        // 如果没有可用的分类
        if (grid.children.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🛠️</div>
                    <h3 style="margin-bottom: 10px;">暂无可用工具</h3>
                    <p>当前没有启用的工具，请联系管理员</p>
                </div>
            `;
        }
    },

    // 显示分类下的工具
    showCategoryTools: function(cat) {
        const container = document.getElementById('dynamicContent');
        const enabledTools = cat.tools.filter(t => t.enabled);
        
        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="btn-logout" onclick="User.render()">← 返回分类列表</button>
            </div>
            <h3 style="margin-bottom: 20px; color: var(--primary-color);">${cat.name}</h3>
            <div class="tool-grid" id="toolGrid"></div>
        `;
        
        const grid = document.getElementById('toolGrid');
        
        enabledTools.forEach(tool => {
            const card = UI.renderToolCard(tool, () => {
                this.runTool(tool);
            });
            grid.appendChild(card);
        });
    },

    // 运行工具
    runTool: function(tool) {
        // 检查是否是GitHub模块工具（新格式）
        if (tool.isGitHubModule) {
            this.runGitHubModule(tool);
            return;
        }
        
        // 原有逻辑：获取工具逻辑
        const logic = ToolLoader.getToolLogic(tool.logic);
        
        if (!logic) {
            UI.alert('工具逻辑未找到，请联系管理员');
            return;
        }
        
        // 打开运行弹窗
        document.getElementById('runToolName').innerText = tool.name;
        
        const modalBody = document.getElementById('runModalBody');
        modalBody.innerHTML = `
            <div class="desc-box">
                <p><strong>工具说明：</strong>${tool.desc || logic.description || '暂无说明'}</p>
                <p><strong>输出表名：</strong>${logic.sheetName || tool.name}</p>
            </div>
            <div class="input-group">
                <label style="font-weight: bold; color: var(--primary-color);">第一步：请选择要处理的源文件 (.xlsx)</label>
                <input type="file" id="runFileInput" accept=".xlsx" style="margin-top: 10px;">
            </div>
            <button class="btn" id="runToolBtn" onclick="User.executeTool('${tool.logic}')">开始处理并导出</button>
            <button class="btn btn-gray" onclick="UI.closeModal('runModal')">取消</button>
        `;
        
        UI.openModal('runModal');
    },

    // 运行GitHub模块工具（新格式）
    runGitHubModule: function(tool) {
        const toolConfig = ToolPlatform.getToolConfig(tool.id);
        
        if (!toolConfig) {
            UI.alert('工具配置未找到，请刷新页面重试');
            return;
        }
        
        // 打开运行弹窗
        document.getElementById('runToolName').innerText = tool.name;
        
        const modalBody = document.getElementById('runModalBody');
        
        // 清空弹窗内容
        modalBody.innerHTML = '';
        
        // 使用工具的render方法渲染界面
        if (toolConfig.render) {
            toolConfig.render(modalBody);
        } else {
            modalBody.innerHTML = `
                <div class="desc-box">
                    <p><strong>工具说明：</strong>${tool.desc || '暂无说明'}</p>
                </div>
                <p style="color: #999; text-align: center; padding: 40px;">
                    该工具暂无界面实现
                </p>
                <button class="btn btn-gray" onclick="UI.closeModal('runModal')" style="width: auto; padding: 10px 30px;">关闭</button>
            `;
        }
        
        UI.openModal('runModal');
    },

    // 执行工具（原有逻辑）
    executeTool: function(logicType) {
        const fileInput = document.getElementById('runFileInput');
        const btn = document.getElementById('runToolBtn');
        
        if (!fileInput.files[0]) {
            UI.alert('请先选择文件');
            return;
        }
        
        const file = fileInput.files[0];
        const logic = ToolLoader.getToolLogic(logicType);
        
        UI.showLoading('正在处理数据...');
        
        CoreEngine.readExcel(file).then(rawData => {
            try {
                // 执行工具逻辑
                const result = logic.process(rawData);
                
                if (!result || !result.data) {
                    throw new Error('工具处理结果格式错误');
                }
                
                // 导出结果
                return CoreEngine.exportExcel(
                    result.data, 
                    result.sheetName || logic.sheetName, 
                    result.fileName || logic.sheetName,
                    result.formatConfig
                );
            } catch (err) {
                throw new Error('处理失败：' + err.message);
            }
        }).then(() => {
            UI.hideLoading();
            UI.closeModal('runModal');
            UI.showToast('处理成功！文件已下载', 'success');
            StateManager.addLog(`运行了工具 [${logic.sheetName}]`, '普通用户');
        }).catch(err => {
            UI.hideLoading();
            UI.alert(err.message);
        });
    }
};

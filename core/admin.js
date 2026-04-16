// 管理员模块
const Admin = {
    currentSection: 'cat',

    // 渲染管理员界面
    render: function() {
        const container = document.getElementById('dynamicContent');
        container.innerHTML = `
            <div class="admin-nav">
                <div id="navCat" class="admin-nav-item active" onclick="Admin.switchSection('cat')">分类管理</div>
                <div id="navTool" class="admin-nav-item" onclick="Admin.switchSection('tool')">工具管理</div>
                <div id="navLog" class="admin-nav-item" onclick="Admin.switchSection('log')">操作日志</div>
                <div id="navSet" class="admin-nav-item" onclick="Admin.switchSection('set')">安全设置</div>
            </div>
            
            <div id="admin-cat" class="admin-section active"></div>
            <div id="admin-tool" class="admin-section"></div>
            <div id="admin-log" class="admin-section"></div>
            <div id="admin-set" class="admin-section"></div>
        `;
        
        this.switchSection('cat');
    },

    // 切换管理区域
    switchSection: function(section) {
        this.currentSection = section;
        
        // 更新导航样式
        document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById('nav' + section.charAt(0).toUpperCase() + section.slice(1)).classList.add('active');
        
        // 显示对应区域
        document.querySelectorAll('.admin-section').forEach(el => el.style.display = 'none');
        document.getElementById('admin-' + section).style.display = 'block';
        
        // 渲染内容
        switch(section) {
            case 'cat': this.renderCategories(); break;
            case 'tool': this.renderTools(); break;
            case 'log': this.renderLogs(); break;
            case 'set': this.renderSettings(); break;
        }
    },

    // 渲染分类管理
    renderCategories: function() {
        const container = document.getElementById('admin-cat');
        const categories = StateManager.get('categories') || [];
        
        container.innerHTML = `
            <button class="btn" style="width: auto; padding: 8px 20px; margin-bottom: 20px;" onclick="Admin.openCatModal()">+ 新建工具分类</button>
            <div id="catList">
                ${categories.map(c => `
                    <div style="background:#f9f9f9; padding:15px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid #eee;">
                        <div><strong>${c.name}</strong> <span style="color:#999; font-size:12px;">(含有 ${c.tools.length} 个工具)</span></div>
                        <div>
                            <span class="action-link" onclick="Admin.openCatModal(${c.id})"><strong>重命名</strong></span>
                            <span class="action-link danger" onclick="Admin.deleteCat(${c.id})"><strong>删除</strong></span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // 渲染工具管理
    renderTools: function() {
        const container = document.getElementById('admin-tool');
        const categories = StateManager.get('categories') || [];
        
        let html = `
            <button class="btn" style="width: auto; padding: 8px 20px; margin-bottom: 20px;" onclick="Admin.openToolModal()">+ 新建工具</button>
            <table class="admin-table">
                <thead>
                    <tr><th>工具名称</th><th>所属分类</th><th>工具说明</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
        `;
        
        categories.forEach(cat => {
            cat.tools.forEach(tool => {
                html += `
                    <tr>
                        <td><strong>${tool.name}</strong></td>
                        <td>${cat.name}</td>
                        <td>${tool.desc || '无'}</td>
                        <td><span class="status-tag ${tool.enabled ? 'status-on' : 'status-off'}">${tool.enabled ? '启用中' : '已禁用'}</span></td>
                        <td style="white-space: nowrap;">
                            <span class="action-link" onclick="Admin.openToolModal(${cat.id}, ${tool.id})"><strong>编辑</strong></span>
                            <span class="action-link danger" onclick="Admin.deleteTool(${cat.id}, ${tool.id})"><strong>删除</strong></span>
                        </td>
                    </tr>
                `;
            });
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },

    // 渲染日志
    renderLogs: function() {
        const container = document.getElementById('admin-log');
        const logs = StateManager.get('logs') || [];
        
        container.innerHTML = `
            <div class="log-container">
                ${logs.slice().reverse().map(log => `
                    <div class="log-entry">
                        <span class="log-time">${log.time}</span>
                        <span class="log-user">${log.user}</span>
                        <span>${log.action}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // 渲染设置
    renderSettings: function() {
        const container = document.getElementById('admin-set');
        const config = StateManager.get('gistConfig');
        
        container.innerHTML = `
            <div style="max-width: 400px; background: #f9f9f9; padding: 25px; border-radius: 12px; border: 1px solid #eee; margin-bottom: 30px;">
                <div class="input-group">
                    <label>修改用户端密码</label>
                    <input type="text" id="setUserPassInput" placeholder="新用户密码">
                </div>
                <div class="input-group">
                    <label>修改管理员密码</label>
                    <input type="text" id="setAdminPassInput" placeholder="新管理员密码">
                </div>
                <button class="btn" onclick="Admin.savePasswords()">确认保存修改</button>
            </div>
            
            <div style="max-width: 400px; background: #f9f9f9; padding: 25px; border-radius: 12px; border: 1px solid #eee; margin-bottom: 30px;">
                <h3 style="margin-bottom: 20px; font-size: 16px; color: var(--primary-color);">Gist同步状态</h3>
                <div class="desc-box" style="margin-bottom: 20px;">
                    <p>当前Gist ID: <strong>${config.gistId}</strong></p>
                    <p>同步状态: <span id="syncStatus">未同步</span></p>
                    <p style="margin-top: 10px;">Gist令牌: <input type="password" id="gistTokenInput" placeholder="输入GitHub个人访问令牌" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px;"></p>
                </div>
                <button class="btn" onclick="Admin.syncWithGist()" style="margin-bottom: 10px;">手动同步</button>
                <button class="btn btn-gray" onclick="Admin.resetGistConfig()">重置Gist配置</button>
            </div>
            
            <div style="max-width: 400px; background: #f9f9f9; padding: 25px; border-radius: 12px; border: 1px solid #eee;">
                <h3 style="margin-bottom: 20px; font-size: 16px; color: var(--primary-color);">配置管理</h3>
                <div class="desc-box" style="margin-bottom: 20px;">
                    <p>通过导出/导入配置，可以在不同设备间同步工具配置。</p>
                </div>
                <button class="btn" onclick="StateManager.exportConfig()" style="margin-bottom: 10px;">导出配置</button>
                <input type="file" id="configImportInput" accept=".json" style="display: none;" onchange="Admin.importConfig(this)">
                <button class="btn btn-gray" onclick="document.getElementById('configImportInput').click()">导入配置</button>
            </div>
        `;
    },

    // 打开分类弹窗
    openCatModal: function(cid) {
        const isEdit = !!cid;
        const cat = isEdit ? StateManager.get('categories').find(c => c.id === cid) : null;
        
        document.getElementById('editModalTitle').innerText = isEdit ? '重命名分类' : '新建分类';
        document.getElementById('editModalBody').innerHTML = `
            <div class="input-group">
                <label>分类名称</label>
                <input type="text" id="catNameInput" value="${cat ? cat.name : ''}" placeholder="请输入分类名称">
            </div>
            <button class="btn" onclick="Admin.saveCategory(${cid || 'null'})">确认并保存</button>
            <button class="btn btn-gray" onclick="UI.closeModal('editModal')">取消</button>
        `;
        
        UI.openModal('editModal');
    },

    // 保存分类
    saveCategory: function(cid) {
        const name = document.getElementById('catNameInput').value.trim();
        if (!name) {
            UI.alert('分类名称不能为空');
            return;
        }
        
        if (cid) {
            StateManager.updateCategory(cid, { name });
            StateManager.addLog(`修改了分类名称为 [${name}]`, '管理员');
        } else {
            StateManager.addCategory(name);
            StateManager.addLog(`新建了分类 [${name}]`, '管理员');
        }
        
        UI.closeModal('editModal');
        this.renderCategories();
    },

    // 删除分类
    deleteCat: function(cid) {
        const cat = StateManager.get('categories').find(c => c.id === cid);
        if (!cat) return;
        
        if (cat.tools.length > 0) {
            UI.alert('该分类下还有工具，无法删除！请先将工具移动到其他分类或删除工具。');
            return;
        }
        
        if (UI.confirm(`确定要删除分类 "${cat.name}" 吗？`)) {
            StateManager.deleteCategory(cid);
            StateManager.addLog(`删除了分类 [${cat.name}]`, '管理员');
            this.renderCategories();
        }
    },

    // 打开工具弹窗
    openToolModal: function(cid, tid) {
        const isEdit = !!tid;
        const categories = StateManager.get('categories');
        
        document.getElementById('editModalTitle').innerText = isEdit ? '编辑工具' : '新建工具';
        document.getElementById('editModalBody').innerHTML = `
            <div class="input-group">
                <label>所属分类</label>
                <select id="toolCatSelect">
                    ${categories.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            ${!isEdit ? `
            <div class="input-group">
                <label>上传工具代码文件 (.js)</label>
                <input type="file" id="toolCodeInput" accept=".js">
            </div>
            <div class="desc-box">
                <p>请上传符合规范的JavaScript文件，包含 toolConfig 对象和 process 函数。</p>
            </div>
            ` : ''}
            <div class="input-group">
                <label>工具说明</label>
                <textarea id="toolDescInput" placeholder="请输入工具说明（可选）" rows="3"></textarea>
            </div>
            <div class="input-group">
                <label>运行状态</label>
                <select id="toolStatusSelect">
                    <option value="true">启用中 (用户可见)</option>
                    <option value="false">已禁用 (用户不可见)</option>
                </select>
            </div>
            <button class="btn" onclick="Admin.saveTool(${cid || 'null'}, ${tid || 'null'})">确认并保存</button>
            <button class="btn btn-gray" onclick="UI.closeModal('editModal')">取消</button>
        `;
        
        UI.openModal('editModal');
    },

    // 保存工具
    saveTool: function(cid, tid) {
        const newCid = parseInt(document.getElementById('toolCatSelect').value);
        const desc = document.getElementById('toolDescInput').value.trim();
        const enabled = document.getElementById('toolStatusSelect').value === 'true';
        
        if (tid) {
            // 编辑现有工具
            const oldCat = StateManager.get('categories').find(c => c.id === cid);
            const tool = oldCat.tools.find(t => t.id === tid);
            tool.enabled = enabled;
            tool.desc = desc;
            
            if (cid !== newCid) {
                StateManager.removeToolFromCategory(cid, tid);
                StateManager.addToolToCategory(newCid, tool);
                StateManager.addLog(`将工具 [${tool.name}] 移动到了分类 [${StateManager.get('categories').find(c => c.id === newCid).name}]`, '管理员');
            } else {
                StateManager.saveToLocal();
                StateManager.addLog(`修改了工具 [${tool.name}]`, '管理员');
            }
            
            UI.closeModal('editModal');
            this.renderTools();
        } else {
            // 创建新工具
            const fileInput = document.getElementById('toolCodeInput');
            if (!fileInput.files[0]) {
                UI.alert('请上传工具代码文件');
                return;
            }
            
            ToolLoader.uploadTool(fileInput.files[0], {
                categoryId: newCid,
                desc: desc
            }).then(tool => {
                StateManager.addLog(`新建了自定义工具 [${tool.name}]`, '管理员');
                UI.closeModal('editModal');
                this.renderTools();
                UI.showToast('工具创建成功！', 'success');
            }).catch(err => {
                UI.alert('代码文件解析失败：' + err.message);
            });
        }
    },

    // 删除工具
    deleteTool: function(cid, tid) {
        const cat = StateManager.get('categories').find(c => c.id === cid);
        const tool = cat.tools.find(t => t.id === tid);
        
        if (UI.confirm(`确定要删除工具 "${tool.name}" 吗？`)) {
            ToolLoader.deleteTool(cid, tid);
            StateManager.addLog(`删除了工具 [${tool.name}]`, '管理员');
            this.renderTools();
        }
    },

    // 保存密码
    savePasswords: function() {
        const userPass = document.getElementById('setUserPassInput').value.trim();
        const adminPass = document.getElementById('setAdminPassInput').value.trim();
        
        if (userPass) {
            Auth.changePassword('user', userPass);
        }
        if (adminPass) {
            Auth.changePassword('admin', adminPass);
        }
        
        UI.alert('设置已保存');
    },

    // 同步到Gist
    syncWithGist: async function() {
        const token = document.getElementById('gistTokenInput').value.trim();
        if (!token) {
            UI.alert('请输入GitHub个人访问令牌');
            return;
        }
        
        try {
            await GistSync.sync(token);
            document.getElementById('syncStatus').innerText = '同步成功';
            document.getElementById('syncStatus').style.color = 'var(--success-color)';
            UI.showToast('同步成功！', 'success');
        } catch (err) {
            document.getElementById('syncStatus').innerText = '同步失败';
            document.getElementById('syncStatus').style.color = 'var(--danger-color)';
            UI.alert('同步失败：' + err.message);
        }
    },

    // 重置Gist配置
    resetGistConfig: function() {
        const newGistId = prompt('请输入新的 Gist ID:');
        if (newGistId) {
            GistSync.updateConfig({ gistId: newGistId });
            UI.alert('Gist 配置已更新，请手动同步配置');
        }
    },

    // 导入配置
    importConfig: function(input) {
        const file = input.files[0];
        if (!file) return;
        
        StateManager.importConfig(file).then(() => {
            UI.alert('配置导入成功，系统将刷新');
            location.reload();
        }).catch(err => {
            UI.alert('配置文件格式错误：' + err.message);
        });
    }
};

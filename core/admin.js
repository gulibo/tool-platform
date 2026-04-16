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
        const ocrConfig = StateManager.get('ocrConfig') || { provider: 'tesseract', huawei: {} };
        
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
            
            <div style="max-width: 500px; background: #f9f9f9; padding: 25px; border-radius: 12px; border: 1px solid #eee; margin-bottom: 30px;">
                <h3 style="margin-bottom: 20px; font-size: 16px; color: var(--primary-color);">🔧 OCR识别配置</h3>
                <div class="desc-box" style="margin-bottom: 20px; background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px;">
                    <p style="margin: 0; color: #856404;">
                        <strong>配置说明：</strong><br>
                        • 本地Tesseract：免费，但准确率一般<br>
                        • 华为云OCR：高精度，新用户每月1000次免费<br>
                        • 配置将保存到系统，所有用户共享此配置
                    </p>
                </div>
                
                <div class="input-group">
                    <label>OCR引擎选择</label>
                    <select id="ocrProviderSelect" onchange="Admin.toggleOCRConfig()" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="tesseract" ${ocrConfig.provider === 'tesseract' ? 'selected' : ''}>本地Tesseract（免费）</option>
                        <option value="huawei" ${ocrConfig.provider === 'huawei' ? 'selected' : ''}>华为云OCR（高精度）</option>
                    </select>
                </div>
                
                <div id="huaweiOCRConfig" style="display: ${ocrConfig.provider === 'huawei' ? 'block' : 'none'}; margin-top: 15px; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;">
                    <div class="input-group">
                        <label>账号类型</label>
                        <select id="ocrAccountType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="main" ${ocrConfig.huawei?.accountType !== 'iam' ? 'selected' : ''}>主账号（访问密钥）</option>
                            <option value="iam" ${ocrConfig.huawei?.accountType === 'iam' ? 'selected' : ''}>IAM用户</option>
                        </select>
                    </div>
                    <div class="input-group" id="domainInputGroup" style="display: ${ocrConfig.huawei?.accountType === 'iam' ? 'block' : 'none'};">
                        <label>主账号名（Domain）<span style="color: #999; font-size: 12px;">- IAM用户需要</span></label>
                        <input type="text" id="ocrHuaweiDomain" value="${ocrConfig.huawei?.domain || ''}" placeholder="请输入主账号名，如：gulibo6156" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="input-group">
                        <label>Access Key (AK) <span style="color: #999; font-size: 12px;">- 华为云访问密钥ID</span></label>
                        <input type="text" id="ocrHuaweiAK" value="${ocrConfig.huawei?.ak || ''}" placeholder="请输入AK" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="input-group">
                        <label>Secret Key (SK) <span style="color: #999; font-size: 12px;">- 华为云秘密访问密钥</span></label>
                        <input type="password" id="ocrHuaweiSK" value="${ocrConfig.huawei?.sk || ''}" placeholder="请输入SK" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <p style="margin: 5px 0 0 0; font-size: 11px; color: #dc3545;">⚠️ SK相当于密码，请妥善保管</p>
                    </div>
                    <div class="input-group">
                        <label>项目ID <span style="color: #999; font-size: 12px;">- 华为云项目ID</span></label>
                        <input type="text" id="ocrHuaweiProjectId" value="${ocrConfig.huawei?.projectId || ''}" placeholder="请输入项目ID" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="input-group">
                        <label>Endpoint <span style="color: #999; font-size: 12px;">- 服务终端节点</span></label>
                        <input type="text" id="ocrHuaweiEndpoint" value="${ocrConfig.huawei?.endpoint || 'ocr.cn-north-4.myhuaweicloud.com'}" placeholder="ocr.cn-north-4.myhuaweicloud.com" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;">
                        <strong>获取方式：</strong><br>
                        1. 访问 <a href="https://www.huaweicloud.com/product/ocr.html" target="_blank" style="color: #1976d2;">华为云OCR</a> 开通服务<br>
                        2. 控制台 → 右上角用户名 → 我的凭证 → 访问密钥<br>
                        3. 项目列表 → 华北-北京四 → 复制项目ID<br>
                        <strong>IAM用户：</strong>需要额外填写主账号名（Domain）
                    </div>
                </div>
                
                <button class="btn" onclick="Admin.saveOCRConfig()" style="margin-top: 15px;">保存OCR配置</button>
                <button class="btn btn-gray" onclick="Admin.testOCRConfig()" style="margin-top: 15px; margin-left: 10px;">测试连接</button>
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
    
    // 切换OCR配置显示
    toggleOCRConfig: function() {
        const provider = document.getElementById('ocrProviderSelect').value;
        const huaweiConfig = document.getElementById('huaweiOCRConfig');
        if (huaweiConfig) {
            huaweiConfig.style.display = provider === 'huawei' ? 'block' : 'none';
        }
        // 绑定账号类型切换事件
        const accountType = document.getElementById('ocrAccountType');
        if (accountType) {
            accountType.onchange = function() {
                const domainGroup = document.getElementById('domainInputGroup');
                if (domainGroup) {
                    domainGroup.style.display = this.value === 'iam' ? 'block' : 'none';
                }
            };
        }
    },
    
    // 保存OCR配置
    saveOCRConfig: function() {
        const provider = document.getElementById('ocrProviderSelect').value;
        
        const config = {
            provider: provider,
            huawei: {
                endpoint: 'ocr.cn-north-4.myhuaweicloud.com'
            }
        };
        
        if (provider === 'huawei') {
            const accountType = document.getElementById('ocrAccountType').value;
            const ak = document.getElementById('ocrHuaweiAK').value.trim();
            const sk = document.getElementById('ocrHuaweiSK').value.trim();
            const projectId = document.getElementById('ocrHuaweiProjectId').value.trim();
            const endpoint = document.getElementById('ocrHuaweiEndpoint').value.trim();
            const domain = document.getElementById('ocrHuaweiDomain').value.trim();
            
            if (!ak || !sk || !projectId) {
                UI.alert('请填写完整的华为云OCR配置信息（AK、SK、项目ID）');
                return;
            }
            
            if (accountType === 'iam' && !domain) {
                UI.alert('IAM用户需要填写主账号名（Domain）');
                return;
            }
            
            config.huawei = {
                accountType: accountType,
                ak: ak,
                sk: sk,
                projectId: projectId,
                endpoint: endpoint || 'ocr.cn-north-4.myhuaweicloud.com',
                domain: domain || ''
            };
        }
        
        StateManager.set('ocrConfig', config);
        StateManager.addLog(`修改了OCR配置，使用${provider === 'huawei' ? '华为云OCR' : '本地Tesseract'}`, '管理员');
        UI.showToast('OCR配置已保存！', 'success');
    },
    
    // 测试OCR配置
    testOCRConfig: async function() {
        const provider = document.getElementById('ocrProviderSelect').value;
        
        if (provider === 'tesseract') {
            UI.showToast('本地Tesseract无需测试，直接使用', 'success');
            return;
        }
        
        const accountType = document.getElementById('ocrAccountType').value;
        const ak = document.getElementById('ocrHuaweiAK').value.trim();
        const sk = document.getElementById('ocrHuaweiSK').value.trim();
        const projectId = document.getElementById('ocrHuaweiProjectId').value.trim();
        const domain = document.getElementById('ocrHuaweiDomain').value.trim();
        
        if (!ak || !sk || !projectId) {
            UI.alert('请填写完整的华为云OCR配置信息');
            return;
        }
        
        if (accountType === 'iam' && !domain) {
            UI.alert('IAM用户需要填写主账号名（Domain）');
            return;
        }
        
        UI.showToast('正在测试华为云连接...', 'info');
        
        try {
            // 构建认证请求体
            let authBody;
            
            if (accountType === 'iam') {
                // IAM用户密码认证（AK填IAM用户名，SK填密码）
                authBody = {
                    auth: {
                        identity: {
                            methods: ['password'],
                            password: {
                                user: {
                                    name: ak,  // IAM用户名
                                    password: sk,  // IAM用户密码
                                    domain: {
                                        name: domain  // 主账号名
                                    }
                                }
                            }
                        },
                        scope: {
                            project: {
                                id: projectId
                            }
                        }
                    }
                };
            } else {
                // 主账号访问密钥认证
                authBody = {
                    auth: {
                        identity: {
                            methods: ['hw_access_key'],
                            hw_access_key: {
                                access: {
                                    key: ak,
                                    secret: sk
                                }
                            }
                        },
                        scope: {
                            project: {
                                id: projectId
                            }
                        }
                    }
                };
            }
            
            // 测试获取Token（使用代理服务器避免CORS）
            const response = await fetch('/api/huawei/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(authBody)
            });
            
            if (response.ok) {
                const token = response.headers.get('X-Subject-Token');
                if (token) {
                    UI.showToast('✅ 华为云OCR连接测试成功！', 'success');
                } else {
                    UI.showToast('⚠️ 连接成功但未获取到Token', 'warning');
                }
            } else {
                const error = await response.text();
                UI.alert('❌ 连接测试失败：' + error);
            }
        } catch (err) {
            UI.alert('❌ 连接测试失败：' + err.message);
        }
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

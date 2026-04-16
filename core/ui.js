// UI模块 - 管理界面渲染和交互
const UI = {
    // 显示/隐藏加载层
    showLoading: function(text) {
        document.getElementById('loading').style.display = 'flex';
        document.getElementById('loadingText').innerText = text || '正在处理...';
    },

    hideLoading: function() {
        document.getElementById('loading').style.display = 'none';
    },

    // 打开弹窗
    openModal: function(modalId, title) {
        if (title) {
            const titleEl = document.querySelector(`#${modalId} .modal-header h3`);
            if (titleEl) titleEl.innerText = title;
        }
        document.getElementById(modalId).style.display = 'flex';
    },

    // 关闭弹窗
    closeModal: function(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    // 显示提示
    showToast: function(message, type = 'info') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9999;
            animation: fadeInOut 3s ease;
        `;
        
        if (type === 'success') {
            toast.style.background = '#f6ffed';
            toast.style.color = '#52c41a';
            toast.style.border = '1px solid #b7eb8f';
        } else if (type === 'error') {
            toast.style.background = '#fff1f0';
            toast.style.color = '#ff4d4f';
            toast.style.border = '1px solid #ffa39e';
        } else {
            toast.style.background = '#e6f7ff';
            toast.style.color = '#1890ff';
            toast.style.border = '1px solid #91d5ff';
        }
        
        toast.innerText = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    },

    // 渲染工具卡片
    renderToolCard: function(tool, onClick) {
        const div = document.createElement('div');
        div.className = 'tool-item';
        div.innerHTML = `
            <span class="icon">${tool.icon || '🛠️'}</span>
            <strong class="title">${tool.name}</strong>
            <div class="desc">${tool.desc || '暂无说明'}</div>
        `;
        if (onClick) {
            div.onclick = onClick;
        }
        return div;
    },

    // 渲染分类卡片
    renderCategoryCard: function(category, onClick) {
        const div = document.createElement('div');
        div.className = 'tool-item';
        div.style.textAlign = 'center';
        div.innerHTML = `
            <span class="icon">📂</span>
            <strong class="title">${category.name}</strong>
            <div style="font-size:12px; color:#999; margin-top:5px;">${category.tools.filter(t => t.enabled).length} 个可用工具</div>
        `;
        if (onClick) {
            div.onclick = onClick;
        }
        return div;
    },

    // 创建表单元素
    createFormGroup: function(label, inputElement) {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.style.textAlign = 'left';
        
        if (label) {
            const labelEl = document.createElement('label');
            labelEl.style.cssText = 'font-size: 13px; color: #666; margin-bottom: 5px; display: block;';
            labelEl.innerText = label;
            div.appendChild(labelEl);
        }
        
        div.appendChild(inputElement);
        return div;
    },

    // 创建输入框
    createInput: function(type, placeholder, value) {
        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder || '';
        if (value) input.value = value;
        return input;
    },

    // 创建选择框
    createSelect: function(options, value) {
        const select = document.createElement('select');
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.innerText = opt.label;
            if (value === opt.value) option.selected = true;
            select.appendChild(option);
        });
        return select;
    },

    // 创建文本域
    createTextarea: function(placeholder, value, rows) {
        const textarea = document.createElement('textarea');
        textarea.placeholder = placeholder || '';
        if (value) textarea.value = value;
        if (rows) textarea.rows = rows;
        return textarea;
    },

    // 创建按钮
    createButton: function(text, onClick, type = 'primary') {
        const btn = document.createElement('button');
        btn.className = 'btn';
        if (type === 'gray') {
            btn.classList.add('btn-gray');
        }
        btn.innerText = text;
        btn.onclick = onClick;
        return btn;
    },

    // 清空元素
    clearElement: function(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = '';
        }
    },

    // 确认对话框
    confirm: function(message) {
        return confirm(message);
    },

    // 提示对话框
    alert: function(message) {
        alert(message);
    }
};

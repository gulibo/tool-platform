// 认证模块 - 处理登录和权限
const Auth = {
    currentRole: 'user',
    isLoggedIn: false,

    // 设置角色
    setRole: function(role) {
        this.currentRole = role;
        document.getElementById('tabUser').className = role === 'user' ? 'tab-btn active' : 'tab-btn';
        document.getElementById('tabAdmin').className = role === 'admin' ? 'tab-btn active' : 'tab-btn';
        document.getElementById('passwordInput').value = '';
        document.getElementById('loginError').style.display = 'none';
    },

    // 登录
    login: function() {
        const pwd = document.getElementById('passwordInput').value;
        const error = document.getElementById('loginError');
        const state = StateManager.get();
        
        if ((this.currentRole === 'user' && pwd === state.userPass) || 
            (this.currentRole === 'admin' && pwd === state.adminPass)) {
            
            this.isLoggedIn = true;
            document.getElementById('loginView').style.display = 'none';
            document.getElementById('dashboardView').style.display = 'block';
            document.getElementById('currentUserRole').innerText = this.currentRole === 'admin' ? '管理员模式' : '普通用户';
            
            StateManager.addLog(`[${this.currentRole}] 登录系统`, this.currentRole === 'admin' ? '管理员' : '普通用户');
            
            // 加载对应界面
            if (this.currentRole === 'admin') {
                Admin.render();
            } else {
                User.render();
            }
        } else {
            error.style.display = 'block';
        }
    },

    // 退出登录
    logout: function() {
        this.isLoggedIn = false;
        location.reload();
    },

    // 检查是否已登录
    checkAuth: function() {
        return this.isLoggedIn;
    },

    // 获取当前角色
    getRole: function() {
        return this.currentRole;
    },

    // 修改密码
    changePassword: function(role, newPassword) {
        if (role === 'user') {
            StateManager.set('userPass', newPassword);
        } else if (role === 'admin') {
            StateManager.set('adminPass', newPassword);
        }
        StateManager.addLog(`修改了${role === 'user' ? '用户端' : '管理员'}密码`, '管理员');
    }
};

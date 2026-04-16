// 主应用入口
const App = {
    // 初始化应用
    init: async function() {
        console.log('Initializing Tool Platform...');
        
        // 1. 初始化状态管理器
        await StateManager.init();
        console.log('State manager initialized');
        
        // 2. 初始化工具加载器
        await ToolLoader.init();
        console.log('Tool loader initialized');
        
        // 3. 设置回车键登录
        document.getElementById('passwordInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                Auth.login();
            }
        });
        
        console.log('Tool Platform ready');
    }
};

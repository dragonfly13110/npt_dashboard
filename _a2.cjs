const fs=require('fs');
const a=[
'',
'.login-divider { margin: 2px 0 !important; }',
'.login-divider .ant-divider-inner-text { color: #484f58 !important; font-size: 12px; font-weight: 500; letter-spacing: 0.5px; }',
'.login-divider::before, .login-divider::after { border-color: rgba(255,255,255,0.05) !important; }',
'',
'.login-input { background: rgba(255,255,255,0.03) !important; border: 1px solid rgba(255,255,255,0.07) !important; color: #e6edf3 !important; border-radius: 12px !important; height: 50px !important; font-size: 15px !important; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }',
'.login-input::placeholder { color: #484f58 !important; font-size: 14px; }',
'.login-input:hover { border-color: rgba(255,255,255,0.14) !important; background: rgba(255,255,255,0.05) !important; }',
'.login-input:focus, .ant-input-affix-wrapper:focus-within .login-input, .login-input.ant-input-affix-wrapper-focused { border-color: #1a7f37 !important; box-shadow: 0 0 0 4px rgba(26,127,55,0.12), 0 0 20px rgba(26,127,55,0.06) !important; background: rgba(26,127,55,0.04) !important; }',
'.login-input .ant-input-prefix { color: #6e7681 !important; margin-right: 10px; transition: color 0.25s; }',
'.login-input:focus .ant-input-prefix, .ant-input-affix-wrapper-focused .ant-input-prefix { color: #2da44e !important; }',
'.login-input.ant-input-password .ant-input-suffix .anticon { color: #6e7681 !important; }',
'.login-card-new .ant-form-item-label > label { color: #8b949e !important; font-weight: 500; font-size: 13px; }',
'.login-card-new .ant-form-item { margin-bottom: 18px; }',
];
fs.appendFileSync('T:/web/npt_dashboard/src/styles/login.css',a.join('\n'));
console.log('done');

import os

class Config:
    # 飞书应用配置
    # 请替换为实际的 App ID 和 App Secret
    FEISHU_APP_ID = os.environ.get("FEISHU_APP_ID", "your_app_id_here")
    FEISHU_APP_SECRET = os.environ.get("FEISHU_APP_SECRET", "your_app_secret_here")
    
    # 多维表格配置
    BASE_ID = "B9DOwvEymiferskGjBzcVnR2nUv"
    TABLE_ID = "tblMfyzEqYKdWmTL"

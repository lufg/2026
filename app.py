from flask import Flask, render_template, abort
import requests
import time
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# 缓存 Access Token
class TokenManager:
    def __init__(self):
        self.token = None
        self.expire_time = 0

    def get_token(self):
        if self.token and time.time() < self.expire_time:
            return self.token
        
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        headers = {"Content-Type": "application/json; charset=utf-8"}
        data = {
            "app_id": app.config["FEISHU_APP_ID"],
            "app_secret": app.config["FEISHU_APP_SECRET"]
        }
        
        try:
            response = requests.post(url, json=data)
            resp_json = response.json()
            if resp_json.get("code") == 0:
                self.token = resp_json["tenant_access_token"]
                # 提前 5 分钟过期，确保安全
                self.expire_time = time.time() + resp_json["expire"] - 300
                return self.token
            else:
                print(f"Error getting token: {resp_json}")
                return None
        except Exception as e:
            print(f"Exception getting token: {e}")
            return None

token_manager = TokenManager()

def get_feishu_records():
    token = token_manager.get_token()
    if not token:
        return []
    
    base_id = app.config["BASE_ID"]
    table_id = app.config["TABLE_ID"]
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{base_id}/tables/{table_id}/records"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        resp_json = response.json()
        if resp_json.get("code") == 0:
            return resp_json["data"]["items"]
        else:
            print(f"Error fetching records: {resp_json}")
            return []
    except Exception as e:
        print(f"Exception fetching records: {e}")
        return []

@app.route('/')
def index():
    records = get_feishu_records()
    # 简单的处理数据，提取字段
    posts = []
    for record in records:
        fields = record["fields"]
        posts.append({
            "id": record["record_id"],
            "title": fields.get("标题", "无标题"),
            "quote": fields.get("金句输出", ""),
            "review": fields.get("黄叔点评", ""),
            "summary": fields.get("概要内容输出", "")
        })
    return render_template('index.html', posts=posts)

@app.route('/article/<record_id>')
def detail(record_id):
    # 这里为了演示简单，直接再次获取列表查找（实际生产应该单独获取详情API或者缓存）
    # 飞书获取单条记录 API: GET /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}
    
    token = token_manager.get_token()
    if not token:
        abort(500)
        
    base_id = app.config["BASE_ID"]
    table_id = app.config["TABLE_ID"]
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{base_id}/tables/{table_id}/records/{record_id}"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        resp_json = response.json()
        if resp_json.get("code") == 0:
            fields = resp_json["data"]["record"]["fields"]
            post = {
                "id": resp_json["data"]["record"]["record_id"],
                "title": fields.get("标题", "无标题"),
                "quote": fields.get("金句输出", ""),
                "review": fields.get("黄叔点评", ""),
                "content": fields.get("概要内容输出", "") # 暂时用概要代替全文，用户未指定全文特定字段，假设概要即内容，或者需要确认
            }
            # 注意：readme 中提到 "完整文章内容"，但字段列表中只列出了 "概要内容输出"。
            # 假设 "概要内容输出" 就是用于详情展示的内容，或者字段名实际上可能有 "文章内容"？
            # 根据 readme 37行 "概要内容输出"，18行 "完整文章内容"。
            # 暂时使用 "概要内容输出" 作为详情页内容，因为没有其他字段信息。
            
            return render_template('detail.html', post=post)
        else:
            abort(404)
    except Exception as e:
        print(f"Error: {e}")
        abort(500)

if __name__ == '__main__':
    app.run(debug=True)

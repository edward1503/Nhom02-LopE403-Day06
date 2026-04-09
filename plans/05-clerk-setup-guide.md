# Hướng dẫn cấu hình Clerk Authentication

## Bước 1: Tạo tài khoản & Application trên Clerk

1. Truy cập [https://clerk.com](https://clerk.com) → **Sign Up** (hoặc Sign In nếu đã có).
2. Nhấn **Create application**.
3. Đặt tên app: `AI Tutor` (hoặc tuỳ ý).
4. Chọn phương thức đăng nhập:
   - ✅ **Email** (bắt buộc)
   - ✅ **Google** (tuỳ chọn, nếu muốn login bằng Google)
5. Nhấn **Create**.

---

## Bước 2: Lấy API Keys

Sau khi tạo app, bạn sẽ thấy trang **API Keys**. Nếu không thấy, vào:

> Sidebar trái → **Configure** → **API keys**

Bạn cần 2 key:

| Key | Dạng | Dùng ở đâu |
|-----|------|------------|
| **Publishable key** | `pk_test_xxxx...` | Frontend (Next.js) |
| **Secret key** | `sk_test_xxxx...` | Frontend (Next.js server-side) |

### Điền vào file `frontend/.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Bước 3: Lấy JWKS URL (cho Backend Python)

Backend FastAPI cần verify JWT token mà Clerk cấp. Để làm điều này, cần URL chứa public keys (JWKS).

1. Trong Clerk Dashboard → **Configure** → **API keys**
2. Kéo xuống phần **Advanced** → tìm **JWKS URL**
   - Format: `https://<your-app-id>.clerk.accounts.dev/.well-known/jwks.json`
   - Hoặc bạn tự ghép: lấy **Frontend API** URL (dạng `https://xxxx.clerk.accounts.dev`) rồi thêm `/.well-known/jwks.json`

### Điền vào file `.env` ở thư mục gốc project:

```env
GEMINI_API_KEY=your_gemini_key_here
CLERK_JWKS_URL=https://your-app-id.clerk.accounts.dev/.well-known/jwks.json
```

---

## Bước 4: Cấu hình Domain (khi dùng Cloudflare Tunnel)

Khi bạn expose app qua `cloudflared`, Clerk cần biết domain của bạn:

1. Chạy tunnel trước để lấy URL:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Bạn sẽ nhận được URL dạng: `https://abc-xyz-123.trycloudflare.com`

2. Vào Clerk Dashboard → **Configure** → **Domains**:
   - **Production domain**: Thêm URL tunnel vào (ví dụ: `abc-xyz-123.trycloudflare.com`)
   - Hoặc để trống nếu chỉ test local (`localhost:3000`)

> **Lưu ý**: Mỗi lần chạy `cloudflared` sẽ tạo URL mới (trừ khi dùng named tunnel). Bạn cần cập nhật lại domain trong Clerk Dashboard mỗi lần đổi URL.

---

## Bước 5: Cấu hình Redirect URLs

Vào Clerk Dashboard → **Configure** → **Paths**:

| Setting | Giá trị |
|---------|---------|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/` |
| After sign-up URL | `/` |

---

## Tóm tắt các file cần config

```
Day06-AI-Product-Hackathon/
├── .env                          ← GEMINI_API_KEY + CLERK_JWKS_URL
└── frontend/
    └── .env.local                ← NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
```

## Kiểm tra nhanh

Sau khi config xong, chạy:

```bash
# Terminal 1: Backend
python -m src.api.app

# Terminal 2: Frontend
cd frontend
npm run dev
```

Truy cập `http://localhost:3000` → Clerk sẽ redirect bạn sang trang Sign In. Đăng nhập bằng email → vào app chính.

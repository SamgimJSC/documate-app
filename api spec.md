# API Specification
---

## 1. Auth

### 1.1 로그인

- Method: `POST`
- URL: `/auth/login`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

- Response body:

```json
{
  "user": {
    "id": "string",
    "email": "user@example.com",
    "nickname": "string",
    "plan": "free" | "pro",
    "storageUsed": 1.2,
    "storageLimit": 5
  },
  "token": "jwt-token",
  "isPinSet": true,
  "isPinVerified": true,
  "isBiometricEnabled": false
}
```

### 1.2 회원가입

- Method: `POST`
- URL: `/auth/register`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "email": "user@example.com",
  "password": "string",
  "nickname": "홍길동"
}
```

- Response body:

```json
{
  "user": {
    "id": "string",
    "email": "user@example.com",
    "nickname": "홍길동",
    "plan": "free",
    "storageUsed": 0,
    "storageLimit": 5
  },
  "token": "jwt-token",
  "isPinSet": false,
  "isPinVerified": false,
  "isBiometricEnabled": false
}
```

### 1.3 이메일 중복 확인

- Method: `GET`
- URL: `/auth/check-email`
- Query:
  - `email` (required)
- Path: 없음
- Request body: 없음
- Response body:

```json
{
  "email": "user@example.com",
  "exists": true
}
```

### 1.4 로그아웃

- Method: `POST`
- URL: `/auth/logout`
- Query: 없음
- Path: 없음
- Request body: 없음
- Response body:

```json
{
  "success": true
}
```

### 1.5 비밀번호 검증

- Method: `POST`
- URL: `/auth/password/verify`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "password": "string"
}
```

- Response body:

```json
{
  "valid": true
}
```

### 1.6 비밀번호 변경

- Method: `POST`
- URL: `/auth/password/update`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

- Response body:

```json
{
  "success": true
}
```

### 1.7 PIN 설정

- Method: `POST`
- URL: `/auth/pin/setup`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "pin": "000000"
}
```

- Response body:

```json
{
  "success": true,
  "isPinSet": true
}
```

### 1.8 PIN 검증

- Method: `POST`
- URL: `/auth/pin/verify`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "pin": "000000"
}
```

- Response body:

```json
{
  "valid": true,
  "isAuthenticated": true,
  "isPinVerified": true
}
```

### 1.9 생체인증 활성화

- Method: `POST`
- URL: `/auth/biometric/enable`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "enabled": true
}
```

- Response body:

```json
{
  "success": true,
  "isBiometricEnabled": true
}
```

---

## 2. Documents

### 2.1 문서 목록 조회

- Method: `GET`
- URL: `/documents`
- Query:
  - `search` (optional)
  - `category` (optional)
  - `status` (optional, `active` | `expiring_soon` | `expired`)
  - `favorite` (optional, `true` | `false`)
- Path: 없음
- Response body:

```json
{
  "documents": [
    {
      "id": "doc-1",
      "title": "string",
      "category": "계약서",
      "uploadedAt": "2026-01-01",
      "expiryDate": "2027-01-01",
      "imageUri": "string",
      "tags": ["string"],
      "isFavorite": true,
      "status": "active",
      "extractedData": {
        "date": "2026-01-01",
        "amount": "string",
        "parties": ["string"],
        "notes": "string"
      }
    }
  ]
}
```

### 2.2 문서 상세 조회

- Method: `GET`
- URL: `/documents/{documentId}`
- Query: 없음
- Path:
  - `documentId` (required)
- Response body:

```json
{
  "id": "doc-1",
  "title": "string",
  "category": "계약서",
  "uploadedAt": "2026-01-01",
  "expiryDate": "2027-01-01",
  "imageUri": "string",
  "tags": ["string"],
  "isFavorite": true,
  "status": "active",
  "extractedData": {
    "date": "2026-01-01",
    "amount": "string",
    "parties": ["string"],
    "notes": "string"
  },
  "notifications": [
    {
      "id": "n1",
      "date": "2026-12-01",
      "label": "만기 1개월 전 알림",
      "enabled": true
    }
  ]
}
```

### 2.3 문서 업로드 / 추가

- Method: `POST`
- URL: `/documents`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "title": "string",
  "category": "계약서",
  "expiryDate": "2027-01-01",
  "imageUri": "string",
  "tags": ["string"],
  "extractedData": {
    "date": "2026-01-01",
    "amount": "string",
    "parties": ["string"],
    "notes": "string"
  },
  "notifications": [
    {
      "date": "2026-12-01",
      "label": "만기 1개월 전 알림",
      "enabled": true
    }
  ]
}
```

- Response body:

```json
{
  "id": "doc-99",
  "success": true
}
```

### 2.4 문서 수정

- Method: `PATCH`
- URL: `/documents/{documentId}`
- Query: 없음
- Path:
  - `documentId`
- Request body:

```json
{
  "title": "string",
  "category": "보험서류",
  "expiryDate": "2027-01-01",
  "tags": ["string"],
  "isFavorite": true,
  "extractedData": {
    "notes": "string"
  }
}
```

- Response body:

```json
{
  "success": true
}
```

### 2.5 문서 삭제

- Method: `DELETE`
- URL: `/documents/{documentId}`
- Query: 없음
- Path:
  - `documentId`
- Response body:

```json
{
  "success": true
}
```

### 2.6 문서 즐겨찾기 토글

- Method: `PATCH`
- URL: `/documents/{documentId}/favorite`
- Query: 없음
- Path:
  - `documentId`
- Request body:

```json
{
  "isFavorite": true
}
```

- Response body:

```json
{
  "success": true,
  "isFavorite": true
}
```

### 2.7 문서 알림 목록 조회

- Method: `GET`
- URL: `/documents/{documentId}/notifications`
- Query: 없음
- Path:
  - `documentId`
- Response body:

```json
{
  "notifications": [
    {
      "id": "n1",
      "date": "2026-12-01",
      "label": "만기 1개월 전 알림",
      "enabled": true
    }
  ]
}
```

### 2.8 문서 알림 설정 변경

- Method: `PATCH`
- URL: `/documents/{documentId}/notifications/{notificationId}`
- Query: 없음
- Path:
  - `documentId`
  - `notificationId`
- Request body:

```json
{
  "enabled": false
}
```

- Response body:

```json
{
  "success": true
}
```

---

## 3. Notifications

### 3.1 알림 목록 조회

- Method: `GET`
- URL: `/notifications`
- Query:
  - `status` (optional, `all` | `unread` | `read`)
- Path: 없음
- Response body:

```json
{
  "notifications": [
    {
      "id": "expiry-doc-1",
      "type": "expiry",
      "title": "만료 임박 서류",
      "body": "\"계약서\"이(가) 3일 후 만료됩니다.",
      "time": "1시간 전",
      "read": false,
      "documentId": "doc-1"
    }
  ]
}
```

### 3.2 알림 읽음 처리

- Method: `PATCH`
- URL: `/notifications/{notificationId}/read`
- Query: 없음
- Path:
  - `notificationId`
- Request body:

```json
{
  "read": true
}
```

- Response body:

```json
{
  "success": true
}
```

### 3.3 모든 알림 읽음 처리

- Method: `PATCH`
- URL: `/notifications/read-all`
- Query: 없음
- Path: 없음
- Request body: 없음
- Response body:

```json
{
  "success": true
}
```

### 3.4 알림 예약 / 스케줄링

- Method: `POST`
- URL: `/notifications/schedule`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "documentId": "doc-1",
  "date": "2026-12-01",
  "title": "만료 예정 문서",
  "body": "계약서가 만료됩니다."
}
```

- Response body:

```json
{
  "notificationId": "notif-123",
  "scheduledAt": "2026-12-01T09:00:00Z"
}
```

### 3.5 알림 취소

- Method: `POST`
- URL: `/notifications/cancel`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "notificationId": "notif-123"
}
```

- Response body:

```json
{
  "success": true
}
```

---

## 4. Payments

### 4.1 결제/구독 플랜 조회

- Method: `GET`
- URL: `/payments/plans`
- Query: 없음
- Path: 없음
- Response body:

```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "storageLimit": 5
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 4500,
      "storageLimit": 50
    }
  ]
}
```

### 4.2 결제 내역 조회

- Method: `GET`
- URL: `/payments/history`
- Query:
  - `month` (optional, `YYYY-MM`)
- Path: 없음
- Response body:

```json
{
  "payments": [
    {
      "id": "pay-1",
      "amount": 4500,
      "currency": "KRW",
      "status": "paid",
      "method": "card",
      "createdAt": "2026-05-01T12:00:00Z",
      "description": "Pro 구독"
    }
  ]
}
```

### 4.3 프로 업그레이드 / 결제 실행

- Method: `POST`
- URL: `/payments/subscribe`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "planId": "pro",
  "paymentMethodId": "pm_abc123"
}
```

- Response body:

```json
{
  "success": true,
  "subscriptionId": "sub-123",
  "planId": "pro",
  "status": "active"
}
```

### 4.4 결제 요약 조회

- Method: `GET`
- URL: `/payments/summary`
- Query:
  - `month` (optional, `YYYY-MM`)
- Path: 없음
- Response body:

```json
{
  "month": "2026-05",
  "totalSpent": 123400,
  "transactions": 8,
  "trend": "up"
}
```

---

## 5. Search

### 5.1 통합 검색

- Method: `GET`
- URL: `/search`
- Query:
  - `q` (required)
  - `type` (optional, `documents` | `receipts` | `all`)
  - `category` (optional)
  - `page` (optional)
  - `limit` (optional)
- Path: 없음
- Response body:

```json
{
  "query": "임대차",
  "results": {
    "documents": [
      {
        "id": "doc-1",
        "title": "신촌 아파트 임대차 계약서",
        "category": "계약서",
        "snippet": "보증금 3,000만원 / 월세 80만원"
      }
    ],
    "receipts": [
      {
        "id": "r-7",
        "storeName": "넷플릭스",
        "amount": 17000,
        "date": "2026-05-10"
      }
    ]
  }
}
```

### 5.2 문서 검색

- Method: `GET`
- URL: `/search/documents`
- Query:
  - `q` (required)
  - `category` (optional)
  - `favorite` (optional)
- Path: 없음
- Response body:

```json
{
  "results": [
    {
      "id": "doc-1",
      "title": "신촌 아파트 임대차 계약서",
      "category": "계약서",
      "snippet": "보증금 3,000만원"
    }
  ]
}
```

### 5.3 영수증 검색

- Method: `GET`
- URL: `/search/receipts`
- Query:
  - `q` (required)
  - `month` (optional)
  - `category` (optional)
- Path: 없음
- Response body:

```json
{
  "results": [
    {
      "id": "r-3",
      "storeName": "스타벅스 연세대점",
      "amount": 8500,
      "date": "2026-05-12"
    }
  ]
}
```

---

## 6. 추가 항목 (\*)

### 6.1 Receipts\* (추가)

앱 내 영수증 탭이 있으므로 `receipts` API를 별도 문서로 추가하면 좋습니다.

#### 영수증 목록 조회

- Method: `GET`
- URL: `/receipts`
- Query:
  - `month` (optional, `YYYY-MM`)
  - `category` (optional)
  - `favorite` (optional)
- Path: 없음
- Response body:

```json
{
  "receipts": [
    {
      "id": "r-1",
      "storeName": "GS25 신촌점",
      "category": "마트/편의점",
      "amount": 5200,
      "date": "2026-05-10",
      "imageUri": "string",
      "isFavorite": false,
      "items": [{ "name": "삼각김밥", "price": 1500 }]
    }
  ]
}
```

#### 영수증 상세 조회

- Method: `GET`
- URL: `/receipts/{receiptId}`
- Path:
  - `receiptId`
- Response body:

```json
{
  "id": "r-1",
  "storeName": "GS25 신촌점",
  "category": "마트/편의점",
  "amount": 5200,
  "date": "2026-05-10",
  "imageUri": "string",
  "isFavorite": false,
  "items": [
    { "name": "삼각김밥", "price": 1500 },
    { "name": "아메리카노 캔", "price": 1800 }
  ]
}
```

#### 영수증 추가

- Method: `POST`
- URL: `/receipts`
- Query: 없음
- Path: 없음
- Request body:

```json
{
  "storeName": "string",
  "category": "식비",
  "amount": 8900,
  "date": "2026-05-10",
  "imageUri": "string",
  "items": [{ "name": "상품명", "price": 4500 }]
}
```

- Response body:

```json
{
  "id": "r-99",
  "success": true
}
```

#### 영수증 즐겨찾기 토글

- Method: `PATCH`
- URL: `/receipts/{receiptId}/favorite`
- Query: 없음
- Path:
  - `receiptId`
- Request body:

```json
{
  "isFavorite": true
}
```

- Response body:

```json
{
  "success": true,
  "isFavorite": true
}
```

---

> 이 문서는 현재 앱 화면과 내부 스토어 구조를 기반으로 작성했습니다.
> 실제 서버 구현 상황에 맞춰 `token` 인증 헤더, 오류 코드, 페이징 필드(`page`, `limit`, `total`) 등은 추가로 보강하면 좋습니다.

import { DocumentCategory } from './mock-data';

export interface ExtractedField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

export const CATEGORY_FIELDS: Record<DocumentCategory, ExtractedField[]> = {
  계약서: [
    { key: 'contractDate', label: '계약일', placeholder: 'YYYY-MM-DD' },
    { key: 'expiryDate',   label: '만료일', placeholder: 'YYYY-MM-DD' },
    { key: 'renewalDate',  label: '갱신일', placeholder: 'YYYY-MM-DD' },
    { key: 'parties',      label: '계약자', placeholder: '예: 홍길동, 이순신' },
  ],
  보증서: [
    { key: 'productName',    label: '제품명',   placeholder: '예: 삼성 갤럭시 S24' },
    { key: 'purchaseDate',   label: '구매일',   placeholder: 'YYYY-MM-DD' },
    { key: 'warrantyPeriod', label: '보증기간', placeholder: '예: 1년' },
    { key: 'repairDate',     label: '수리일',   placeholder: 'YYYY-MM-DD' },
  ],
  처방전: [
    { key: 'hospitalName', label: '병원명', placeholder: '예: 서울대병원' },
    { key: 'visitDate',    label: '진료일', placeholder: 'YYYY-MM-DD' },
    { key: 'amount',       label: '금액',   placeholder: '예: 50,000원' },
    { key: 'medication',   label: '약품명', placeholder: '예: 아목시실린', multiline: true },
  ],
  보험서류: [
    { key: 'insurer',      label: '보험사', placeholder: '예: 삼성생명' },
    { key: 'contractDate', label: '계약일', placeholder: 'YYYY-MM-DD' },
    { key: 'expiryDate',   label: '만료일', placeholder: 'YYYY-MM-DD' },
    { key: 'amount',       label: '보험금', placeholder: '예: 1,000만원' },
  ],
  영수증: [
    { key: 'date',    label: '날짜',   placeholder: 'YYYY-MM-DD' },
    { key: 'amount',  label: '금액',   placeholder: '예: 31,000원' },
    { key: 'parties', label: '발행처', placeholder: '예: 스타벅스 강남점' },
    { key: 'notes',   label: '메모',   placeholder: '기타 메모', multiline: true },
  ],
  기타: [
    { key: 'date',    label: '날짜',   placeholder: 'YYYY-MM-DD' },
    { key: 'amount',  label: '금액',   placeholder: '예: 50,000원' },
    { key: 'parties', label: '당사자', placeholder: '예: 홍길동, 이순신' },
    { key: 'notes',   label: '메모',   placeholder: '기타 메모', multiline: true },
  ],
};

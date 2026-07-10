import { Colors, Radius, Spacing } from '@/constants/theme';
import { downloadDocumentPdf } from '@/services/download';
import {
  DocumentAlert,
  deleteAlert,
  getDocumentAlerts,
  updateAlert,
} from '@/services/notifications';
import { useAuthStore } from '@/stores/auth-store';
import { useDocStore } from '@/stores/doc-store';
import { showToast } from '@/stores/toast-store';
import { getErrorMessage } from '@/utils/error';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function OcrTextBox({ label, value }: { label: string; value: string }) {
  const cleaned = value
    .replace(/\[p\d+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return (
    <View style={styles.ocrBoxWrap}>
      <Text style={styles.ocrBoxLabel}>{label}</Text>
      <ScrollView
        style={styles.ocrBox}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <Text style={styles.ocrBoxText} selectable>{cleaned}</Text>
      </ScrollView>
    </View>
  );
}

const FIELD_LABELS: Record<string, string> = {
  contractDate: '계약일',
  expiryDate: '만료일',
  renewalDate: '갱신일',
  parties: '계약자/발행처',
  productName: '제품명',
  purchaseDate: '구매일',
  warrantyPeriod: '보증기간',
  repairDate: '수리일',
  hospitalName: '병원명',
  visitDate: '진료일',
  amount: '금액',
  medication: '약품명',
  insurer: '보험사',
  date: '날짜',
  notes: '메모',
  // ── 인물/당사자 ──────────────────────────────
  name: '이름',
  fullName: '성명',
  full_name: '성명',
  customerName: '고객명',
  customer_name: '고객명',
  buyerName: '구매자명',
  buyer_name: '구매자명',
  sellerName: '판매자명',
  seller_name: '판매자명',
  landlord: '임대인',
  tenant: '임차인',
  lessor: '임대인',
  lessee: '임차인',
  contractor: '계약자',
  owner: '소유자',
  representative: '대표자',
  guarantor: '보증인',
  witness: '증인',
  agent: '대리인',
  patientName: '환자명',
  patient_name: '환자명',
  doctorName: '의사명',
  doctor_name: '의사명',
  prescriber: '처방의',
  insured: '피보험자',
  beneficiary: '수익자',
  policyHolder: '계약자',
  policy_holder: '계약자',

  // ── 날짜/기간 ────────────────────────────────
  issueDate: '발급일',
  issue_date: '발급일',
  signDate: '서명일',
  sign_date: '서명일',
  startDate: '시작일',
  start_date: '시작일',
  endDate: '종료일',
  end_date: '종료일',
  effectiveDate: '효력 발생일',
  effective_date: '효력 발생일',
  terminationDate: '해지일',
  termination_date: '해지일',
  dueDate: '납부기한',
  due_date: '납부기한',
  paymentDate: '결제일',
  payment_date: '결제일',
  orderDate: '주문일',
  order_date: '주문일',
  receiptDate: '영수일',
  receipt_date: '영수일',
  manufactureDate: '제조일',
  manufacture_date: '제조일',
  expirationDate: '유효기간',
  expiration_date: '유효기간',
  diagnosisDate: '진단일',
  diagnosis_date: '진단일',
  dischargeDate: '퇴원일',
  discharge_date: '퇴원일',
  admissionDate: '입원일',
  admission_date: '입원일',

  // ── 금액/결제 ────────────────────────────────
  total: '합계',
  totalAmount: '합계금액',
  total_amount: '합계금액',
  tax: '세금',
  taxAmount: '세금액',
  tax_amount: '세금액',
  vat: '부가세',
  vatAmount: '부가세',
  vat_amount: '부가세',
  subtotal: '소계',
  subTotal: '소계',
  price: '가격',
  unitPrice: '단가',
  unit_price: '단가',
  discount: '할인',
  discountAmount: '할인금액',
  discount_amount: '할인금액',
  discountRate: '할인율',
  discount_rate: '할인율',
  paymentMethod: '결제수단',
  payment_method: '결제수단',
  paymentType: '결제유형',
  payment_type: '결제유형',
  cardNumber: '카드번호',
  card_number: '카드번호',
  cardType: '카드종류',
  card_type: '카드종류',
  change: '거스름돈',
  tip: '팁',
  fee: '수수료',
  penalty: '위약금',
  deposit: '보증금',
  premium: '보험료',
  deductible: '자기부담금',
  copay: '본인부담금',
  coverageAmount: '보장금액',
  coverage_amount: '보장금액',
  claimAmount: '청구금액',
  claim_amount: '청구금액',
  rent: '임대료',
  maintenanceFee: '관리비',
  maintenance_fee: '관리비',

  // ── 장소/연락처 ──────────────────────────────
  address: '주소',
  storeName: '상호',
  store_name: '상호',
  storeAddress: '매장 주소',
  store_address: '매장 주소',
  shopName: '상호',
  shop_name: '상호',
  companyName: '회사명',
  company_name: '회사명',
  company: '회사',
  organization: '기관',
  department: '부서',
  hospitalAddress: '병원 주소',
  hospital_address: '병원 주소',
  propertyAddress: '부동산 주소',
  property_address: '부동산 주소',
  phone: '전화번호',
  phoneNumber: '전화번호',
  phone_number: '전화번호',
  fax: '팩스',
  email: '이메일',
  website: '웹사이트',
  location: '장소',

  // ── 상품/제품 ────────────────────────────────
  items: '항목',
  itemName: '품목명',
  item_name: '품목명',
  itemList: '품목 목록',
  item_list: '품목 목록',
  quantity: '수량',
  modelNumber: '모델번호',
  model_number: '모델번호',
  modelName: '모델명',
  model_name: '모델명',
  serialNumber: '시리얼번호',
  serial_number: '시리얼번호',
  manufacturer: '제조사',
  brand: '브랜드',
  color: '색상',
  size: '크기',
  weight: '무게',
  specification: '사양',
  specifications: '사양',

  // ── 보험/보증 ────────────────────────────────
  policyNumber: '증권번호',
  policy_number: '증권번호',
  policyType: '보험종류',
  policy_type: '보험종류',
  coverageType: '보장유형',
  coverage_type: '보장유형',
  warrantyNumber: '보증번호',
  warranty_number: '보증번호',
  serviceCenterPhone: '서비스센터 번호',
  service_center_phone: '서비스센터 번호',

  // ── 의료 ────────────────────────────────────
  diagnosis: '진단명',
  symptoms: '증상',
  symptom: '증상',
  dosage: '복용량',
  frequency: '복용횟수',
  duration: '복용기간',
  refills: '리필 횟수',
  pharmacyName: '약국명',
  pharmacy_name: '약국명',
  patientId: '환자번호',
  patient_id: '환자번호',
  ward: '병동',
  roomNumber: '병실번호',
  room_number: '병실번호',

  // ── 계약 ────────────────────────────────────
  contractNumber: '계약번호',
  contract_number: '계약번호',
  contractType: '계약유형',
  contract_type: '계약유형',
  contractPeriod: '계약기간',
  contract_period: '계약기간',
  paymentTerms: '결제조건',
  payment_terms: '결제조건',
  deliveryTerms: '납품조건',
  delivery_terms: '납품조건',
  jurisdiction: '준거법',
  governingLaw: '준거법',
  governing_law: '준거법',

  // ── 공통 ────────────────────────────────────
  registrationNumber: '사업자번호',
  registration_number: '사업자번호',
  businessNumber: '사업자번호',
  business_number: '사업자번호',
  receiptNumber: '영수증번호',
  receipt_number: '영수증번호',
  invoiceNumber: '청구서번호',
  invoice_number: '청구서번호',
  orderNumber: '주문번호',
  order_number: '주문번호',
  referenceNumber: '참조번호',
  reference_number: '참조번호',
  documentNumber: '문서번호',
  document_number: '문서번호',
  title: '제목',
  content: '내용',
  description: '내용',
  reason: '사유',
  purpose: '목적',
  category: '분류',
  type: '유형',
  status: '상태',
  memo: '메모',
  remark: '비고',
  remarks: '비고',
  note: '비고',
  signature: '서명',
  seal: '인감',
  support_email: '고객지원 이메일',
  supportEmail: '고객지원 이메일',
  contact_number: '연락처',
  contactNumber: '연락처',
  manufactuer_country: '제조국',
  manufacturerCountry: '제조국',
  manufacturer_country: '제조국',
  customer_center_number: '고객센터 번호',
  customerCenterNumber: '고객센터 번호',
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/cabinet' as any);
    }
  };
  const [downloading, setDownloading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { pin: storedPin, verifyPinWithServer } = useAuthStore();
  const hasFetchedRef = useRef(false);
  const { documents, toggleFavorite, removeDocument, fetchDocuments, toggleSecured } = useDocStore();
  const doc = documents.find((d) => d.id === id);

  const [serverAlerts, setServerAlerts] = useState<DocumentAlert[]>([]);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalInput, setPinModalInput] = useState('');
  const [pinModalError, setPinModalError] = useState(false);
  const [pinModalLoading, setPinModalLoading] = useState(false);
  const [pinModalPurpose, setPinModalPurpose] = useState<'enable' | 'disable'>('enable');

  // 알림 탭 등으로 스토어가 비어있는 채 진입할 경우 문서 목록을 새로 가져옴
  useEffect(() => {
    if (!doc && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setFetching(true);
      fetchDocuments().finally(() => setFetching(false));
    }
  }, []);

  useEffect(() => {
    if (!doc) return;
    getDocumentAlerts(doc.id)
      .then(setServerAlerts)
      .catch((e) => console.log('문서 알림 조회 실패:', e));
  }, [doc?.id]);

  if (!doc) {
    if (fetching) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>문서를 찾을 수 없습니다</Text>
          <TouchableOpacity onPress={() => goBack()}>
            <Text style={styles.backLink}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const PIN_ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];

  const handleDelete = () => {
    Alert.alert('문서 삭제', '이 문서를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          // 1) 즉시 캐비닛으로 이동 — 여기서 먼저 이동해야
          //    removeDocument의 낙관적 업데이트(로컬 제거)가 이 화면을
          //    재렌더해서 "문서를 찾을 수 없습니다" 깜빡임이 생기지 않음
          router.replace('/(tabs)/cabinet' as any);
          // 2) 삭제 처리 (로컬 즉시 제거 → API 호출)
          removeDocument(doc.id).catch(() => {
            showToast('문서 삭제에 실패했습니다.', 'error');
          });
        },
      },
    ]);
  };

  const handleDeleteAlert = async (alertId: string) => {
    setServerAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
    try {
      await deleteAlert(doc.id, alertId);
    } catch (e) {
      console.log('알림 삭제 실패:', e);
    }
  };

  const handleToggleAlertPush = async (alertId: string, currentValue: boolean) => {
    const newValue = !currentValue;
    setServerAlerts((prev) =>
      prev.map((a) => a.alert_id === alertId ? { ...a, channel_app_push: newValue } : a)
    );
    try {
      await updateAlert(doc.id, alertId, { channel_app_push: newValue });
    } catch (e) {
      setServerAlerts((prev) =>
        prev.map((a) => a.alert_id === alertId ? { ...a, channel_app_push: currentValue } : a)
      );
      console.log('알림 토글 실패:', e);
    }
  };

  const handleToggleSecured = () => {
    setPinModalPurpose(doc.isSecured ? 'disable' : 'enable');
    setPinModalInput('');
    setPinModalError(false);
    setPinModalVisible(true);
  };

  const handlePinModalDigit = async (digit: string) => {
    if (pinModalInput.length >= 6 || pinModalLoading) return;
    const next = pinModalInput + digit;
    setPinModalInput(next);
    setPinModalError(false);
    if (next.length === 6) {
      setPinModalLoading(true);
      const ok = storedPin ? next === storedPin : await verifyPinWithServer(next);
      setPinModalLoading(false);
      if (ok) {
        toggleSecured(doc.id);
        setPinModalVisible(false);
        setPinModalInput('');
        router.replace('/(tabs)/cabinet' as any);
      } else {
        setPinModalError(true);
        setTimeout(() => { setPinModalInput(''); setPinModalError(false); }, 600);
      }
    }
  };

  const categoryIcons: Record<string, string> = {
    '계약서': '📄',
    '보증서': '🛡️',
    '처방전': '💊',
    '보험서류': '🏥',
    '기타': '📁',
  };

  const today = new Date().toISOString().split('T')[0];
  const daysUntil = doc.expiryDate
    ? Math.ceil((new Date(doc.expiryDate).getTime() - new Date(today).getTime()) / 86400000)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{doc.title}</Text>
        <View style={styles.headerActions}>
        {/* 수정 버튼 */}
        <TouchableOpacity
            onPress={() => router.push(`/document/edit/${doc.id}`)}
            style={styles.headerBtn}>
            <Ionicons name="pencil-outline" size={22} color={Colors.gray700} />
          </TouchableOpacity>
          {/* 즐겨찾기 버튼 */}
          <TouchableOpacity onPress={() => toggleFavorite(doc.id)} style={styles.headerBtn}>
            <Ionicons
              name={doc.isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={doc.isFavorite ? Colors.warning : Colors.gray400}
            />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={downloading}
            onPress={async () => {
              setDownloading(true);
              try {
                const ok = await downloadDocumentPdf(doc.id, doc.title);
                if (ok) showToast('PDF가 저장되었습니다.', 'success');
              } catch (e) {
                showToast(getErrorMessage(e), 'error');
              } finally {
                setDownloading(false);
              }
            }}
            style={styles.headerBtn}>
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 문서 메타 정보 */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>카테고리</Text>
            <View style={styles.metaValueRow}>
              <Text style={styles.metaVal}>{doc.category}</Text>
              <TouchableOpacity onPress={() => router.push(`/document/edit/${doc.id}` as any)}>
                <Text style={styles.metaEditBtn}>수정</Text>
              </TouchableOpacity>
            </View>
          </View>
          {doc.fileType && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>파일 정보</Text>
              <Text style={styles.metaVal}>
                {doc.fileType}{doc.fileSizeBytes ? ` · ${formatFileSize(doc.fileSizeBytes)}` : ''}
              </Text>
            </View>
          )}
          {doc.issueDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>발급일</Text>
              <Text style={styles.metaVal}>{doc.issueDate}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>만료일</Text>
            <Text style={[
              styles.metaVal,
              daysUntil !== null && daysUntil <= 0 ? styles.metaValError :
              daysUntil !== null && daysUntil <= 30 ? styles.metaValWarning : undefined,
            ]}>
              {doc.expiryDate
                ? `${doc.expiryDate}${daysUntil !== null ? (daysUntil <= 0 ? ' (만료됨)' : ` (${daysUntil}일 후)`) : ''}`
                : '-'}
            </Text>
          </View>
          {doc.renewalDate && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>갱신일</Text>
              <Text style={styles.metaVal}>{doc.renewalDate}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>업로드일</Text>
            <Text style={styles.metaVal}>{doc.uploadedAt}</Text>
          </View>
        </View>

        {/* 첨부 이미지 (있을 때만) */}
        {doc.imageUri && (
          <View style={styles.imageCard}>
            <Image source={{ uri: doc.imageUri }} style={styles.docImage} resizeMode="cover" />
          </View>
        )}

        {/* AI 추출 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI 추출 정보</Text>
            <TouchableOpacity onPress={() => router.push(`/document/edit/${doc.id}` as any)}>
              <Text style={styles.metaEditBtn}>수정</Text>
            </TouchableOpacity>
          </View>
          {(() => {
            const entries = Object.entries(doc.extractedData ?? {}).filter(([, v]) => v);
            if (entries.length === 0) {
              return <Text style={styles.infoValueEmpty}>추출된 정보가 없습니다</Text>;
            }
            const shortEntries = entries.filter(([, v]) => String(v).length < 150);
            const longEntries  = entries.filter(([, v]) => String(v).length >= 150);
            return (
              <>
                <View style={styles.infoGrid}>
                  {shortEntries.map(([k, v]) => (
                    <View key={k} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{FIELD_LABELS[k] ?? k}</Text>
                      <Text style={styles.infoValue}>{String(v)}</Text>
                    </View>
                  ))}
                </View>
                {longEntries.map(([k, v]) => (
                  <OcrTextBox key={k} label={FIELD_LABELS[k] ?? k} value={String(v)} />
                ))}
              </>
            );
          })()}
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>알림 설정</Text>
            <TouchableOpacity onPress={() => router.push(`/document/edit/${doc.id}` as any)}>
              <Text style={styles.notifAddText}>+ 알림 추가</Text>
            </TouchableOpacity>
          </View>
          {(() => {
            const validAlerts = serverAlerts.filter((a) => !!a.notify_date);
            if (validAlerts.length === 0) {
              return <Text style={styles.notifEmpty}>설정된 알림이 없습니다</Text>;
            }
            return (
              <View style={styles.notifList}>
                {validAlerts.map((alert, index) => (
                  <View key={alert.alert_id ?? String(index)} style={styles.notifItem}>
                    <View style={styles.notifInfo}>
                      <Text style={styles.notifLabel}>{alert.notify_date!.split('T')[0]}</Text>
                    </View>
                    <Switch
                      value={!!alert.channel_app_push}
                      onValueChange={() => handleToggleAlertPush(alert.alert_id, !!alert.channel_app_push)}
                      trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                      thumbColor={alert.channel_app_push ? Colors.primary : Colors.gray400}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteAlert(alert.alert_id)}
                      style={styles.notifDeleteBtn}
                      hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {/* 태그 */}
        {(doc.tags ?? []).length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>태그</Text>
    <View style={styles.tagRow}>
      {(doc.tags ?? []).map((tag, index) => (
        <View key={tag || String(index)} style={styles.tag}>
          <Text style={styles.tagText}>#{tag}</Text>
        </View>
      ))}
    </View>
  </View>
)}

        {/* 문서 보호 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>문서 보호</Text>
          <Text style={styles.secureDesc}>
            보안 문서로 설정하면 문서를 열람할 때 PIN 번호를 입력해야 합니다.
          </Text>
          <View style={styles.secureRow}>
            <View style={styles.secureRowInfo}>
              <Text style={styles.secureRowTitle}>PIN 보호 사용</Text>
              <Text style={styles.secureRowSub}>{doc.isSecured ? '보안 문서로 설정됨' : '설정 안 됨'}</Text>
            </View>
            <Switch
              value={!!doc.isSecured}
              onValueChange={handleToggleSecured}
              trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
              thumbColor={doc.isSecured ? Colors.primary : Colors.gray400}
            />
          </View>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* PIN 인증 모달 */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pinModalPurpose === 'enable' ? '보안 문서로 설정' : '보안 해제'}
            </Text>
            <Text style={styles.modalSubtitle}>PIN 번호를 입력해주세요</Text>
            <View style={styles.pinDots}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pinModalInput.length > i && styles.pinDotFilled,
                    pinModalError && styles.pinDotError,
                  ]}
                />
              ))}
            </View>
            {pinModalError && <Text style={styles.pinErrorText}>PIN이 올바르지 않습니다</Text>}
            {pinModalLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
            ) : null}
            <View style={styles.pinPad}>
              {PIN_ROWS.map((row, ri) => (
                <View key={ri} style={styles.pinRow}>
                  {row.map((key) =>
                    key === '' ? (
                      <View key="empty" style={styles.pinKey} />
                    ) : key === 'del' ? (
                      <TouchableOpacity
                        key="del"
                        style={styles.pinKey}
                        onPress={() => setPinModalInput((p) => p.slice(0, -1))}
                      >
                        <Ionicons name="backspace-outline" size={22} color={Colors.gray700} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        key={key}
                        style={styles.pinKey}
                        onPress={() => handlePinModalDigit(key)}
                      >
                        <Text style={styles.pinKeyText}>{key}</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPinModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundText: { fontSize: 16, color: Colors.gray500 },
  backLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.gray900, marginLeft: Spacing.xs },
  headerActions: { flexDirection: 'row' },
  headerBtn: { padding: Spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  metaCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
  metaKey: { fontSize: 13, color: Colors.gray500, width: 64 },
  metaVal: { flex: 1, fontSize: 13, color: Colors.gray900, fontWeight: '500', textAlign: 'right' },
  metaValError: { color: Colors.error },
  metaValWarning: { color: Colors.warning },
  metaValueRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm },
  metaEditBtn: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  imageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  docImage: { width: '100%', height: 220, borderRadius: Radius.md, backgroundColor: Colors.gray100 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  infoGrid: { gap: Spacing.sm },
  infoRow: { flexDirection: 'row', gap: Spacing.md },
  infoLabel: { fontSize: 13, color: Colors.gray500, width: 60 },
  infoValue: { flex: 1, fontSize: 13, color: Colors.gray800, fontWeight: '500' },
  infoValueEmpty: { color: Colors.gray300, fontWeight: '400' },
  ocrBoxWrap: { gap: 6 },
  ocrBoxLabel: { fontSize: 12, color: Colors.gray500 },
  ocrBox: {
    maxHeight: 200,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  ocrBoxText: { fontSize: 13, color: Colors.gray700, lineHeight: 20 },
  notifList: { gap: Spacing.sm },
  notifItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifInfo: { flex: 1 },
  notifLabel: { fontSize: 14, color: Colors.gray800, fontWeight: '500' },
  notifDate: { fontSize: 12, color: Colors.gray400 },
  notifEmpty: { fontSize: 13, color: Colors.gray400 },
  notifDeleteBtn: { padding: 4 },
  notifAddText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  tagText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  // PIN 잠금 화면
  pinHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  pinBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  pinIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pinTitle: { fontSize: 20, fontWeight: '700', color: Colors.gray900 },
  pinDocName: { fontSize: 14, color: Colors.gray500, maxWidth: 260, textAlign: 'center' },
  pinDots: { flexDirection: 'row', gap: 16, marginVertical: Spacing.md },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.gray300,
    backgroundColor: 'transparent',
  },
  pinDotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pinDotError: { borderColor: Colors.error, backgroundColor: Colors.error },
  pinErrorText: { fontSize: 13, color: Colors.error, marginTop: -Spacing.xs },
  pinPad: { width: '100%', maxWidth: 280, gap: 8, marginTop: Spacing.sm },
  pinRow: { flexDirection: 'row', gap: 8 },
  pinKey: {
    flex: 1,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  pinKeyText: { fontSize: 22, fontWeight: '600', color: Colors.gray900 },

  // 문서 보호 섹션
  secureDesc: { fontSize: 13, color: Colors.gray500, lineHeight: 18 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secureRowInfo: { flex: 1, marginRight: Spacing.md },
  secureRowTitle: { fontSize: 14, fontWeight: '600', color: Colors.gray900 },
  secureRowSub: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  secureNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secureNoteText: { fontSize: 12, color: Colors.primary },

  // PIN 인증 모달
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
  modalSubtitle: { fontSize: 14, color: Colors.gray500 },
  modalCancel: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  modalCancelText: { fontSize: 15, color: Colors.gray500, fontWeight: '500' },
});

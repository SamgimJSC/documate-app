import { Radius, Spacing } from '@/constants/theme';
import React, { useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View, ViewStyle } from 'react-native';

export interface CreditCardData {
  cardName: string | null;
  issuer: string | null;
  imgUrl: string | null;
  rank?: number;        // 1-based
  isBest?: boolean;
}

const RANK_COLORS = ['#1B5E43', '#4A1C8A', '#12306B'];
const FALLBACK_COLOR = '#374151';

interface Props {
  card: CreditCardData;
  color?: string;
  style?: ViewStyle;
}

/** 표준 신용카드 비율(85.6×54mm ≈ 1.586:1)의 카드 비주얼 컴포넌트 */
export function CreditCardView({ card, color, style }: Props) {
  const bg = color ?? RANK_COLORS[(card.rank ?? 1) - 1] ?? FALLBACK_COLOR;
  const hasImg = !!card.imgUrl;

  const [imgPortrait, setImgPortrait] = useState(false);
  const [cardW, setCardW] = useState(0);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!card.imgUrl) return;
    urlRef.current = card.imgUrl;
    Image.getSize(
      card.imgUrl,
      (w, h) => { if (urlRef.current === card.imgUrl) setImgPortrait(h > w); },
      () => {},
    );
  }, [card.imgUrl]);

  const onLayout = (e: LayoutChangeEvent) => setCardW(e.nativeEvent.layout.width);

  // 세로 이미지를 가로 프레임에 맞게 회전 배치
  // 컨테이너 W×H(H=W/1.586), 이미지를 H×W(세로)로 배치 후 -90° → IC칩 좌측
  const cardH = cardW / 1.586;
  const offset = cardW > 0 ? (cardW - cardH) / 2 : 0;

  return (
    <View
      style={[styles.card, { backgroundColor: hasImg ? '#e8e8e8' : bg }, style]}
      onLayout={onLayout}
    >
      {/* ── 가로 이미지 ── */}
      {hasImg && !imgPortrait && (
        <Image source={{ uri: card.imgUrl! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      )}
      {/* ── 세로 이미지 → -90° 회전으로 IC칩 좌측 배치 ── */}
      {hasImg && imgPortrait && cardW > 0 && (
        <Image
          source={{ uri: card.imgUrl! }}
          style={{
            position: 'absolute',
            width: cardH,
            height: cardW,
            left: offset,
            top: -offset,
            transform: [{ rotate: '-90deg' }],
          }}
          resizeMode="cover"
        />
      )}

      {/* ── 이미지 없을 때만 장식 요소 렌더 ── */}
      {!hasImg && (
        <>
          <View style={styles.decCircleLg} />
          <View style={styles.decCircleSm} />
          <View style={styles.sheen} />
        </>
      )}

      {/* ─── 상단: 발급사 + 칩 (이미지 없을 때만) ─── */}
      {!hasImg && (
        <View style={styles.top}>
          <Text style={styles.issuer} numberOfLines={1}>{card.issuer ?? ''}</Text>
          <View style={styles.chip}>
            <View style={styles.chipLineH} />
            <View style={styles.chipLineV} />
            <View style={[styles.chipLineH, { top: '33%' }]} />
            <View style={[styles.chipLineH, { top: '66%' }]} />
          </View>
        </View>
      )}

      {/* ─── 중단: 카드 번호 (이미지 없을 때만) ─── */}
      {!hasImg && (
        <Text style={styles.number}>•••• •••• •••• ••••</Text>
      )}

      {/* ─── 하단: 카드명 + 네트워크 로고 (이미지 없을 때만) ─── */}
      {!hasImg && (
        <View style={styles.bottom}>
          <Text style={styles.name} numberOfLines={1}>{card.cardName ?? ''}</Text>
          <View style={styles.network}>
            <View style={[styles.netCircle, { marginRight: -8, backgroundColor: 'rgba(255,255,255,0.35)' }]} />
            <View style={[styles.netCircle, { backgroundColor: 'rgba(255,255,255,0.20)' }]} />
          </View>
        </View>
      )}

      {/* ─── 순위 뱃지 (항상) ─── */}
      {card.rank !== undefined && (
        <View style={[styles.rankPill, hasImg && styles.rankPillOnImg]}>
          <Text style={styles.rankPillText}>{card.rank}위</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    padding: Spacing.md,
    justifyContent: 'space-between',
  },

  // 장식 요소
  decCircleLg: {
    position: 'absolute',
    width: '80%', aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: '-40%', right: '-20%',
  },
  decCircleSm: {
    position: 'absolute',
    width: '45%', aspectRatio: 1,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: '-25%', left: '-10%',
  },
  sheen: {
    position: 'absolute',
    width: '55%', height: '200%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: '-50%', left: '15%',
    transform: [{ rotate: '20deg' }],
  },

  // 상단
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issuer: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    marginRight: 8,
  },
  chip: {
    width: 34, height: 26,
    borderRadius: 5,
    backgroundColor: 'rgba(255,220,120,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(200,160,60,0.9)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLineH: {
    position: 'absolute',
    width: '100%', height: 1,
    backgroundColor: 'rgba(160,110,20,0.5)',
    top: '50%',
  },
  chipLineV: {
    position: 'absolute',
    height: '100%', width: 1,
    backgroundColor: 'rgba(160,110,20,0.5)',
    left: '50%',
  },

  // 중단
  number: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 2,
  },

  // 하단
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    flex: 1,
    marginRight: 8,
  },
  network: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netCircle: {
    width: 22, height: 22,
    borderRadius: 11,
  },

  // 순위 뱃지
  rankPill: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rankPillOnImg: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
});

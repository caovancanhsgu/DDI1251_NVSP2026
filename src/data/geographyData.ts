import type { MilestoneId, MilestoneInfo, TabId } from '../types/geography';

export const TAB_METADATA: Record<TabId, { shortTitle: string; headerTitle: string }> = {
  sun_rays: {
    shortTitle: 'Góc của tia Mặt trời',
    headerTitle: 'Chuyển động của Trái Đất xung quanh Mặt Trời',
  },
};

export const MILESTONES: Record<MilestoneId, MilestoneInfo> = {
  xuan_phan: {
    id: 'xuan_phan',
    name: 'Xuân phân',
    dateLabel: '21/3',
    dayOfYear: 80,
    subsolarLabel: '0° (Xích đạo)',
    subsolarLat: 0,
    color: '#e0b400',
    arcColor: '#e0b400',
    northSeason: 'Bắt đầu Mùa xuân',
    southSeason: 'Bắt đầu Mùa thu',
    northDetails: 'Ngày dài bằng đêm (12h ngày, 12h đêm). Mặt Trời mọc chính Đông, lặn chính Tây.',
    southDetails: 'Ngày dài bằng đêm (12h ngày, 12h đêm). Bước vào tiết thu mát mẻ dần.',
    explanation:
      'Vào ngày 21/3, trục Trái Đất không ngả bán cầu nào về phía Mặt Trời. Tia sáng Mặt Trời chiếu thẳng góc với tiếp tuyến bề mặt tại Xích đạo (0°), làm đường phân chia sáng – tối đi qua đúng hai cực Bắc và Nam.',
  },
  ha_chi: {
    id: 'ha_chi',
    name: 'Hạ chí',
    dateLabel: '21–22/6',
    dayOfYear: 172,
    subsolarLabel: "23°27'B (Chí tuyến Bắc)",
    subsolarLat: 23.44,
    color: '#e02020',
    arcColor: '#e02020',
    northSeason: 'Bắt đầu Mùa hè',
    southSeason: 'Bắt đầu Mùa đông',
    northDetails:
      'Ngày dài nhất, đêm ngắn nhất trong năm. Từ vòng cực Bắc (66°33\'B) đến cực Bắc có ngày dài 24 giờ.',
    southDetails:
      'Ngày ngắn nhất, đêm dài nhất trong năm. Từ vòng cực Nam (66°33\'N) đến cực Nam có đêm dài 24 giờ.',
    explanation:
      'Vào ngày 21–22/6, bán cầu Bắc ngả nhiều nhất về phía Mặt Trời do trục Trái Đất nghiêng 23°27\' giữ nguyên phương trong không gian. Tia sáng Mặt Trời chiếu thẳng góc tại Chí tuyến Bắc (23°27\'B).',
  },
  thu_phan: {
    id: 'thu_phan',
    name: 'Thu phân',
    dateLabel: '23/9',
    dayOfYear: 266,
    subsolarLabel: '0° (Xích đạo)',
    subsolarLat: 0,
    color: '#f08a00',
    arcColor: '#f08a00',
    northSeason: 'Bắt đầu Mùa thu',
    southSeason: 'Bắt đầu Mùa xuân',
    northDetails: 'Ngày dài bằng đêm trên toàn Trái Đất (12h ngày, 12h đêm).',
    southDetails: 'Ngày dài bằng đêm trên toàn Trái Đất (12h ngày, 12h đêm). Chuyển sang mùa xuân.',
    explanation:
      'Vào ngày 23/9, hai bán cầu nhận lượng nhiệt và ánh sáng như nhau. Tia sáng Mặt Trời lại chiếu thẳng góc tại Xích đạo (0°), đường phân chia sáng – tối trùng với kinh tuyến đi qua hai cực.',
  },
  dong_chi: {
    id: 'dong_chi',
    name: 'Đông chí',
    dateLabel: '22/12',
    dayOfYear: 356,
    subsolarLabel: "23°27'N (Chí tuyến Nam)",
    subsolarLat: -23.44,
    color: '#1e90ff',
    arcColor: '#1e90ff',
    northSeason: 'Bắt đầu Mùa đông',
    southSeason: 'Bắt đầu Mùa hè',
    northDetails:
      'Ngày ngắn nhất, đêm dài nhất trong năm. Từ vòng cực Bắc (66°33\'B) đến cực Bắc có đêm dài 24 giờ.',
    southDetails:
      'Ngày dài nhất, đêm ngắn nhất trong năm. Từ vòng cực Nam (66°33\'N) đến cực Nam có ngày dài 24 giờ.',
    explanation:
      'Vào ngày 22/12, bán cầu Nam ngả nhiều nhất về phía Mặt Trời còn bán cầu Bắc chếch xa Mặt Trời nhất. Tia sáng Mặt Trời chiếu thẳng góc tại Chí tuyến Nam (23°27\'N).',
  },
};

export const MILESTONE_ORDER: MilestoneId[] = ['xuan_phan', 'ha_chi', 'thu_phan', 'dong_chi'];

export const SAMPLE_LATITUDES = [
  { label: 'Hà Nội (21°B)', lat: 21 },
  { label: 'TP.HCM (10,8°B)', lat: 10.8 },
  { label: 'Xích đạo (0°)', lat: 0 },
  { label: "Chí tuyến Bắc (23°27'B)", lat: 23.44 },
  { label: "Vòng cực Bắc (66°33'B)", lat: 66.56 },
  { label: "Chí tuyến Nam (23°27'N)", lat: -23.44 },
];

export interface TourStep {
  title: string;
  description: string;
  targetHint: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Thanh công cụ trên cùng',
    description:
      'Chứa các nút điều chỉnh âm thanh, nhạc nền, cỡ chữ nhãn, kiến thức tóm tắt (i), đường liên kết tia sáng, chọn góc nhìn nhanh (4 ô), và cài đặt mô phỏng.',
    targetHint: 'top-right',
  },
  {
    title: '2. Bảng Các mùa (Bắc / Nam bán cầu)',
    description:
      'Chọn nhanh 4 mốc Xuân phân, Hạ chí, Thu phân, Đông chí để đưa Trái Đất bay tới đúng vị trí trên quỹ đạo và mở thẻ phân tích chi tiết. Bạn có thể đổi Bán cầu Bắc / Nam để đối chiếu.',
    targetHint: 'top-left',
  },
  {
    title: '3. Nút "Thay đổi mùa" & Dòng thời gian',
    description:
      'Bấm "thay đổi mùa" (hoặc phím Space) để Trái Đất tự chuyển động liên tục quanh Mặt Trời. Kéo thanh thời gian 1/1 → 31/12 để tua ngày và xem góc chiếu thay đổi tức thì.',
    targetHint: 'top-center',
  },
  {
    title: '4. Không gian mô phỏng 3D tương tác',
    description:
      'Kéo chuột để xoay góc nhìn 360°, cuộn chuột để phóng to/thu nhỏ. Bấm trực tiếp vào các điểm mốc hoặc nhãn mùa trên quỹ đạo để di chuyển Trái Đất.',
    targetHint: 'center',
  },
  {
    title: '5. Thanh điều khiển lớp & ghi chú phía dưới',
    description:
      'Bật/tắt từng lớp hiển thị 3D (quỹ đạo, nhãn mùa, trục nghiêng, vĩ tuyến, đường sáng–tối, tia sáng Mặt Trời) qua nút Lớp và lưu ghi chú học tập.',
    targetHint: 'bottom',
  },
];

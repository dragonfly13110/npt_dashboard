import PesticidesCatalog from '../pesticides/PesticidesCatalog';

export default function FertilizersCatalog() {
  return (
    <PesticidesCatalog
      dataPath="/data/fertilizers/catalog.json"
      basePath="/public/fertilizers"
      pageTitle="คลังองค์ความรู้การใช้ปุ๋ยสำหรับไม้ผล"
      pageDescription="คำแนะนำการจัดการธาตุอาหาร การวิเคราะห์ดิน การคำนวณแม่ปุ๋ย และแนวทางใช้ปุ๋ยสำหรับไม้ผลเศรษฐกิจ โดยอ้างอิงบทและหน้าจากเอกสารต้นฉบับ"
      loadingTip="กำลังโหลดคลังองค์ความรู้การใช้ปุ๋ย..."
      searchPlaceholder="ค้นหาชื่อเรื่อง ชนิดไม้ผล หรือธาตุอาหาร..."
      showMixLab={false}
    />
  );
}

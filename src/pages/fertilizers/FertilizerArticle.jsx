import PesticideArticle from '../pesticides/PesticideArticle';

export default function FertilizerArticle() {
  return (
    <PesticideArticle
      dataPath="/data/fertilizers/articles"
      basePath="/public/fertilizers"
      loadingTip="กำลังโหลดองค์ความรู้การใช้ปุ๋ย..."
      typeLabel="ประเภทความรู้"
    />
  );
}

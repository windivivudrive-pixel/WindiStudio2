import type { GeminiProduct } from '@/lib/gemini/shared';
import styles from './gemini.module.css';
export function ShopProductInfo({ product }: { product: GeminiProduct }) {
  return <div className={styles.productInformation}>
    {!!product.benefits?.length && <section><h3>Lợi ích</h3><ul>{product.benefits.map((item,index)=><li key={index}>{item}</li>)}</ul></section>}
    <section><h3>Bảo hành</h3><p>{product.warrantyStatus === 'included' ? 'Có bảo hành' : product.warrantyStatus === 'none' ? 'Không bảo hành' : 'Chính sách bảo hành chưa được công bố. Liên hệ hỗ trợ để xác nhận trước khi mua.'}</p>{product.warranty && <p>{product.warranty}</p>}</section>
    {product.notes && <section><h3>Lưu ý trước khi mua</h3><p>{product.notes}</p></section>}
  </div>;
}

import Image from 'next/image';
import { publicPath } from '@/lib/public-path';

/** Static identity avoids adding another Rive runtime to the editor. */
export function AdminLogo() {
  return <span className="hk-admin-brand"><Image src={publicPath('/brand/full-logo.svg')} alt="HEISSKRAFT" width={311} height={31} unoptimized /><span>Управление сайтом</span></span>;
}

export function AdminIcon() {
  return <Image className="hk-admin-icon" src={publicPath('/brand/small-black-logo.svg')} alt="HEISSKRAFT" width={48} height={20} unoptimized />;
}

import { publicPath } from "@/lib/public-path";

export default function MediaPlaceholder() {
  return (
    <div className="media-placeholder" aria-hidden="true">
      <img
        src={publicPath("/brand/small-black-logo.svg")}
        alt=""
        width={71}
        height={29}
        className="media-placeholder__logo"
      />
    </div>
  );
}

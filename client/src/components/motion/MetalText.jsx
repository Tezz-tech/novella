/** Text with the brand metal gradient (see .text-metal in brand/tokens.css). */
export default function MetalText({ as: Tag = 'span', className = '', children }) {
  return <Tag className={`text-metal ${className}`}>{children}</Tag>;
}

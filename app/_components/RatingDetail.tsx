import RatingControl from './RatingControl';
export default function RatingDetail({targetType,targetId}:{targetType:'businesses'|'products'|'destinations'|'articles';targetId:string}){return <RatingControl targetType={targetType} targetId={targetId}/>}

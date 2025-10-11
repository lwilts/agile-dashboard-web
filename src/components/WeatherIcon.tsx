import { WeatherIconType } from '../types';

interface WeatherIconProps {
  type: WeatherIconType;
  size?: number;
}

export const WeatherIcon = ({ type, size = 24 }: WeatherIconProps) => {
  const renderIcon = () => {
    switch (type) {
      case 'sunny':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" fill="#FFC800" stroke="#FFB000" strokeWidth="1" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 12 + Math.cos(rad) * 7;
              const y1 = 12 + Math.sin(rad) * 7;
              const x2 = 12 + Math.cos(rad) * 10;
              const y2 = 12 + Math.sin(rad) * 10;
              return (
                <line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FFC800"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        );

      case 'partly_cloudy':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="8" cy="8" r="4" fill="#FFC800" />
            {[315, 0, 45].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 8 + Math.cos(rad) * 5;
              const y1 = 8 + Math.sin(rad) * 5;
              const x2 = 8 + Math.cos(rad) * 7;
              const y2 = 8 + Math.sin(rad) * 7;
              return (
                <line
                  key={angle}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FFC800"
                  strokeWidth="1.5"
                />
              );
            })}
            <ellipse cx="7" cy="16" rx="4" ry="3" fill="#DCDCDC" stroke="#C8C8C8" />
            <ellipse cx="11" cy="15" rx="4.5" ry="3.5" fill="#F0F0F0" stroke="#D2D2D2" />
            <ellipse cx="15" cy="16" rx="4" ry="3" fill="#DCDCDC" stroke="#C8C8C8" />
          </svg>
        );

      case 'cloudy':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <ellipse cx="7" cy="13" rx="4" ry="3.5" fill="#BEBEBE" stroke="#AAAAAA" />
            <ellipse cx="11" cy="11" rx="5" ry="4" fill="#D2D2D2" stroke="#BEBEBE" />
            <ellipse cx="16" cy="13" rx="4.5" ry="3.5" fill="#C8C8C8" stroke="#B4B4B4" />
            <ellipse cx="16" cy="12" rx="4" ry="3" fill="#DCDCDC" stroke="#C8C8C8" />
          </svg>
        );

      case 'rainy':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <ellipse cx="7" cy="9" rx="3.5" ry="3" fill="#8C8C8C" stroke="#787878" />
            <ellipse cx="11" cy="8" rx="4" ry="3.5" fill="#A0A0A0" stroke="#8C8C8C" />
            <ellipse cx="15" cy="9" rx="3.5" ry="3" fill="#969696" stroke="#828282" />
            {[6, 10, 14].map((x, i) => (
              <g key={i}>
                <line x1={x} y1={14} x2={x + 1} y2={17} stroke="#508CFF" strokeWidth="1.5" />
                <line x1={x + 1} y1={17} x2={x} y2={20} stroke="#508CFF" strokeWidth="1.5" />
              </g>
            ))}
          </svg>
        );

      case 'snowy':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <ellipse cx="7" cy="9" rx="3.5" ry="3" fill="#E6E6FA" stroke="#D2D2E6" />
            <ellipse cx="11" cy="8" rx="4" ry="3.5" fill="#F0F0FF" stroke="#DCDCF0" />
            <ellipse cx="15" cy="9" rx="3.5" ry="3" fill="#EBEBF5" stroke="#D7D7E6" />
            {[6, 10, 14].map((x, i) => (
              <g key={i}>
                <line x1={x} y1={14 + i} x2={x} y2={18 + i} stroke="white" strokeWidth="1" />
                <line x1={x - 2} y1={16 + i} x2={x + 2} y2={16 + i} stroke="white" strokeWidth="1" />
                <line x1={x - 1.5} y1={14.5 + i} x2={x + 1.5} y2={17.5 + i} stroke="white" strokeWidth="1" />
                <line x1={x + 1.5} y1={14.5 + i} x2={x - 1.5} y2={17.5 + i} stroke="white" strokeWidth="1" />
              </g>
            ))}
          </svg>
        );

      case 'stormy':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <ellipse cx="7" cy="9" rx="3.5" ry="3" fill="#505050" stroke="#3C3C3C" />
            <ellipse cx="11" cy="8" rx="4" ry="3.5" fill="#646464" stroke="#505050" />
            <ellipse cx="15" cy="9" rx="3.5" ry="3" fill="#5A5A5A" stroke="#464646" />
            <path d="M12 13 L10 17 L11.5 17 L10 21 L14 16 L12.5 16 L13.5 13 Z" fill="#FFFF64" stroke="#E6E600" strokeWidth="0.5" />
          </svg>
        );

      case 'foggy':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {[8, 11, 14, 17, 20].map((y, i) => (
              <line
                key={y}
                x1={2 + (i % 2) * 2}
                y1={y}
                x2={22 - (i % 2) * 2}
                y2={y}
                stroke="#B4B4BE"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ))}
          </svg>
        );

      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" fill="none" />
            <text x="12" y="16" textAnchor="middle" fill="#888" fontSize="16">?</text>
          </svg>
        );
    }
  };

  return <div style={{ display: 'inline-block', lineHeight: 0 }}>{renderIcon()}</div>;
};

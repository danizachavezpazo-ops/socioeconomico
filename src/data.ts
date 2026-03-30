export interface DataPoint {
  Region: string;
  Año: number;
  Mes: string;
  Poblacion: number;
  Pobreza: number;
  PobrezaExtrema: number;
  IngresoPromedio: number;
  Desempleo: number;
  Inflacion: number;
  PoblacionRural: number;
}

const REGIONS = [
  "Lima", "Arequipa", "Cusco", "Piura", "La Libertad", 
  "Cajamarca", "Puno", "Junín", "Ancash", "Loreto"
];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const YEARS = [2023, 2024, 2025];

export const generateMockData = (): DataPoint[] => {
  const data: DataPoint[] = [];

  REGIONS.forEach(region => {
    // Base values for each region to make them distinct
    const basePoverty = 15 + Math.random() * 30;
    const baseIncome = 800 + Math.random() * 1500;
    const baseUnemployment = 4 + Math.random() * 8;

    YEARS.forEach(year => {
      MONTHS.forEach(month => {
        // Add some noise and trends
        const povertyTrend = (year - 2023) * -0.5; // Slight decrease over years
        const incomeTrend = (year - 2023) * 50; // Slight increase over years
        
        const poverty = Math.max(5, basePoverty + povertyTrend + (Math.random() * 4 - 2));
        const income = Math.max(500, baseIncome + incomeTrend + (Math.random() * 200 - 100));
        const unemployment = Math.max(2, baseUnemployment + (Math.random() * 2 - 1));
        
        data.push({
          Region: region,
          Año: year,
          Mes: month,
          Poblacion: Math.floor(500000 + Math.random() * 5000000),
          Pobreza: Number(poverty.toFixed(2)),
          PobrezaExtrema: Number((poverty * 0.3).toFixed(2)),
          IngresoPromedio: Math.floor(income),
          Desempleo: Number(unemployment.toFixed(2)),
          Inflacion: Number((3 + Math.random() * 5).toFixed(2)),
          PoblacionRural: Number((10 + Math.random() * 40).toFixed(2))
        });
      });
    });
  });

  return data;
};

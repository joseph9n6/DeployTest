
// lon,lat (EPSG:4326)
export const routes = [
  {
    id: 1, name: "Bymarka Rundt", type: "hike", difficulty: "easy", duration: 2,
    line: [ [10.340,63.420], [10.350,63.430], [10.360,63.425] ] // Trondheim
  },
  {
    id: 2, name: "Fjellrygg Express", type: "hike", difficulty: "medium", duration: 5,
    line: [ [8.550,61.630], [8.620,61.650], [8.700,61.670] ] // Jotunheimen-ish
  },
  {
    id: 3, name: "Sjøsti Sykkel", type: "bike", difficulty: "easy", duration: 3,
    line: [ [10.650,59.910], [10.700,59.920], [10.750,59.930] ] // Oslo
  },
  {
    id: 4, name: "Langfjell Traverse", type: "hike", difficulty: "hard", duration: 8,
    line: [ [6.100,61.000], [6.200,61.050], [6.300,61.080] ] // Vestland
  },
  {
    id: 5, name: "Kyststripe", type: "bike", difficulty: "medium", duration: 4,
    line: [ [5.300,60.390], [5.350,60.400], [5.420,60.410] ] // Bergen
  },
];


const { Model, DataTypes } = require('sequelize')

class Standard extends Model {}
class Competency extends Model {}
class Cohort extends Model {}
class Apprentice extends Model {}

module.exports = function (sequelize) {
    Standard.init({
        title: DataTypes.STRING
    }, {
        sequelize: sequelize,
        modelName: 'standard'
    })

    Competency.init({
        tag: DataTypes.STRING,
        desc: DataTypes.STRING
    }, {
        sequelize: sequelize,
        modelName: 'competency'
    })

    Cohort.init({
        title: DataTypes.STRING,
        coach: DataTypes.STRING
    }, {
        sequelize: sequelize,
        modelName: 'cohort'
    })

    Apprentice.init({
        name: DataTypes.STRING,
        fileId: DataTypes.STRING
    }, {
        sequelize: sequelize,
        modelName: 'apprentice'
    })

    Standard.hasMany(Competency)
    Standard.hasMany(Cohort)
    Competency.belongsTo(Standard)
    Cohort.belongsTo(Standard)
    Cohort.hasMany(Apprentice)
    Apprentice.belongsTo(Cohort)

    return {Standard, Competency, Cohort, Apprentice}
}